<?php
require_once __DIR__ . '/../helpers.php';
$user    = require_role('working_scholar', 'admin');   // admins may monitor + set schedules
$isAdmin = $user['role'] === 'admin';

// ------------------------------------------------------------------ GET
// ?status=pending|active|returned|rejected|cancelled|all   (default pending)
// ?view=all|borrowed|overdue|due_soon                         (Borrowed Items tabs; implies status=active)
// ?q=TXN-00247 | student ID | item code | name               (Return Processing search)
// ?id=12            one transaction
// ?format=csv|pdf   export the current list
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $view   = $_GET['view'] ?? '';
    $status = $view !== '' ? 'active' : ($_GET['status'] ?? 'pending');

    $sql = 'SELECT t.id, t.status, t.requested_at, t.processed_at, t.expected_return_date,
                   t.returned_at, t.reject_reason, t.return_condition, t.notes, t.late_notes,
                   t.id_surrendered, t.id_returned_at, t.release_condition, t.waiver_accepted_at, t.last_reminder_at,
                   u.id AS user_id, u.id_number AS user_id_number, u.full_name AS borrower, u.mobile_number, u.campus,
                   i.id AS item_id, i.item_code, i.name AS item_name, i.category, i.stock,
                   t.unit_id, un.unit_code,
                   COALESCE(i.requires_id_surrender, c.requires_id_surrender, 0) AS requires_id_surrender,
                   pu.full_name AS processed_by_name,
                   (t.status = "active" AND t.expected_return_date < NOW()) AS is_overdue,
                   (t.status = "active" AND t.expected_return_date >= NOW()
                        AND t.expected_return_date < DATE_ADD(NOW(), INTERVAL ' . DUE_SOON_HOURS . ' HOUR)) AS is_due_soon,
                   IF(t.status = "active" AND t.expected_return_date < NOW(), DATEDIFF(NOW(), t.expected_return_date), 0) AS days_overdue
            FROM transactions t
            JOIN inventories i ON i.id = t.inventory_id
            LEFT JOIN item_units un ON un.id = t.unit_id
            LEFT JOIN categories c ON c.name = i.category
            JOIN users u ON u.id = t.user_id
            LEFT JOIN users pu ON pu.id = t.processed_by
            WHERE 1=1';
    $params = [];

    if (!empty($_GET['id'])) {
        $sql .= ' AND t.id = ?';
        $params[] = (int) $_GET['id'];
    } else {
        if ($status !== 'all') { $sql .= ' AND t.status = ?'; $params[] = $status; }
        if ($view === 'overdue')  $sql .= ' AND t.expected_return_date < NOW()';
        if ($view === 'due_soon') $sql .= ' AND t.expected_return_date >= NOW() AND t.expected_return_date < DATE_ADD(NOW(), INTERVAL ' . DUE_SOON_HOURS . ' HOUR)';
        if (!empty($_GET['q'])) {
            $q = trim((string) $_GET['q']);
            $sql .= ' AND (u.full_name LIKE ? OR u.id_number LIKE ? OR i.item_code LIKE ? OR i.name LIKE ?';
            $like = '%' . $q . '%';
            array_push($params, $like, $like, $like, $like);
            if (preg_match('/^TXN-?\d+$/i', $q) && ($n = parse_tx_code($q))) { $sql .= ' OR t.id = ?'; $params[] = $n; }
            $sql .= ')';
        }
    }
    $stmt = db()->prepare($sql . ' ORDER BY t.requested_at DESC');
    $stmt->execute($params);

    $rows = array_map(function ($r) {
        $r['transaction_code'] = tx_code((int) $r['id']);
        $r['display_status']   = $r['status'] === 'active' && $r['is_due_soon'] ? 'Due Soon' : tx_display_status($r);
        return $r;
    }, $stmt->fetchAll());

    if (!empty($_GET['id'])) {
        if (!$rows) respond(['error' => 'Transaction not found'], 404);
        respond(['borrowing' => $rows[0]]);
    }
    if ($fmt = wants_export()) {
        output_table($fmt, 'borrowed_items', 'Borrowed Items',
            ['Transaction', 'Item', 'Borrower', 'Date Borrowed', 'Due Date', 'Status'],
            array_map(fn($r) => [$r['transaction_code'], $r['item_name'], $r['borrower'],
                                 $r['processed_at'] ?: '-', $r['expected_return_date'] ?: '-', $r['display_status']], $rows));
    }
    respond(['borrowings' => $rows]);
}

// ------------------------------------------------------------------ POST
// {transaction_id, action:'approve', expected_return_date, item_condition?, id_surrendered?, details_complete?, student_id?}
// {transaction_id, action:'reject', reject_reason?}
// {transaction_id, action:'set_schedule', expected_return_date}            (WS or admin)
// {transaction_id, action:'return', return_condition?: Good|Damaged|Lost, late_notes?, id_returned?}
// {transaction_id, action:'send_reminder'}                                (overdue only)
// {action:'manual_entry', student_id, item_code, expected_return_date, id_surrendered?, waiver_accepted?, item_condition?}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_body();
    $txId   = (int) ($body['transaction_id'] ?? 0);
    $action = (string) ($body['action'] ?? '');
    $pdo    = db();

    if ($isAdmin && $action !== 'set_schedule') {
        respond(['error' => 'Only a Working Scholar can process requests and returns'], 403);
    }

    // Validates a return date/time against office hours.
    $schedule = function ($raw, string $category): DateTime {
        $d = $raw ? date_create((string) $raw) : false;
        if (!$d) throw new InvalidArgumentException('Set the expected return date and time');
        if ($d <= new DateTime('now')) throw new InvalidArgumentException('Return date and time must be in the future');
        if ($err = validate_schedule($d, $category)) throw new InvalidArgumentException($err);
        return $d;
    };
    $itemSql = 'SELECT ' . ITEM_SELECT . ' ' . ITEM_FROM . ' WHERE i.id = ? FOR UPDATE';

    $pdo->beginTransaction();
    try {
        // ---------------- walk-in / manual entry (no existing transaction)
        if ($action === 'manual_entry') {
            $su = $pdo->prepare("SELECT * FROM users WHERE id_number = ? AND role = 'student'");
            $su->execute([trim((string) ($body['student_id'] ?? ''))]);
            $student = $su->fetch();
            if (!$student) throw new InvalidArgumentException('Student ID not found');

            $it = $pdo->prepare(str_replace('WHERE i.id = ?', 'WHERE i.item_code = ?', $itemSql));
            $it->execute([trim((string) ($body['item_code'] ?? ''))]);
            $item = $it->fetch();
            if (!$item) throw new InvalidArgumentException('Item code not found');
            if (!decorate_item($item)['can_borrow']) throw new InvalidArgumentException('Item is unavailable');

            $elig = student_eligibility($pdo, (int) $student['id'], $item['category']);
            if (!$elig['allowed']) throw new InvalidArgumentException($elig['reason']);
            if ($item['requires_waiver'] && empty($body['waiver_accepted'])) throw new InvalidArgumentException('The student must accept the waiver first');
            if ($item['requires_id_surrender'] && empty($body['id_surrendered'])) throw new InvalidArgumentException('Collect the student ID before releasing this item');
            $when = $schedule($body['expected_return_date'] ?? null, $item['category']);

            $unit = reserve_unit($pdo, (int) $item['id']);
            if (!$unit) throw new InvalidArgumentException('All copies of this item are taken right now');
            set_unit_status($pdo, (int) $unit['id'], 'borrowed');
            sync_stock($pdo, (int) $item['id']);
            $pdo->prepare("INSERT INTO transactions (user_id, inventory_id, unit_id, status, notes, processed_by, processed_at, expected_return_date,
                                                      waiver_accepted_at, id_surrendered, release_condition)
                           VALUES (?, ?, ?, 'active', 'Manual entry by Working Scholar', ?, NOW(), ?, ?, ?, ?)")
                ->execute([$student['id'], $item['id'], $unit['id'], $user['id'], $when->format('Y-m-d H:i:s'),
                           $item['requires_waiver'] ? date('Y-m-d H:i:s') : null,
                           $item['requires_id_surrender'] ? 1 : 0,
                           trim((string) ($body['item_condition'] ?? $item['item_condition']))]);
            $newTx = (int) $pdo->lastInsertId();
            $pdo->commit();

            log_audit($user, 'Released Item', 'Transaction', tx_code($newTx), 'Manual entry: released ' . $item['name'] . ' (' . $unit['unit_code'] . ') to ' . $student['full_name'],
                      ['type' => 'Borrow Request', 'student' => $student['full_name'], 'item' => $item['name']]);
            notify((int) $student['id'], 'You borrowed ' . $item['name'] . '. Return it by ' . $when->format('M j, Y g:i A') . '.', 'info', $newTx);
            respond(['success' => true, 'action' => $action, 'transaction_id' => $newTx, 'transaction_code' => tx_code($newTx)], 201);
        }

        // ---------------- actions on an existing transaction
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ? FOR UPDATE');
        $stmt->execute([$txId]);
        $tx = $stmt->fetch();
        if (!$tx) throw new InvalidArgumentException('Transaction not found');

        $itemStmt = $pdo->prepare($itemSql);
        $itemStmt->execute([$tx['inventory_id']]);
        $item = $itemStmt->fetch();

        $su = $pdo->prepare('SELECT id, id_number, full_name FROM users WHERE id = ?');
        $su->execute([$tx['user_id']]);
        $student = $su->fetch();
        $meta = ['type' => 'Borrow Request', 'student' => $student['full_name'], 'item' => $item['name']];
        $code = tx_code($txId);
        $firstName = explode(' ', $user['full_name'])[0];

        if ($action === 'approve') {
            if ($tx['status'] !== 'pending') throw new InvalidArgumentException('Only pending requests can be approved');
            if (array_key_exists('details_complete', $body) && !$body['details_complete']) {
                throw new InvalidArgumentException('Details are marked incomplete. Reject the submission instead');
            }
            if (!empty($body['student_id']) && (string) $body['student_id'] !== $student['id_number']) {
                throw new InvalidArgumentException('Student ID does not match this request');
            }
            // The request already holds its own unit, so only the item's status matters here (not the free stock).
            if ($item['availability_status'] !== 'Available') throw new InvalidArgumentException('Item is unavailable');

            $elig = student_eligibility($pdo, (int) $tx['user_id'], $item['category'], $txId);
            if (!$elig['allowed']) throw new InvalidArgumentException($elig['reason']);
            if ($item['requires_waiver'] && !$tx['waiver_accepted_at']) throw new InvalidArgumentException('The student has not accepted the waiver');
            if ($item['requires_id_surrender'] && empty($body['id_surrendered'])) {
                throw new InvalidArgumentException('Collect the student ID before releasing this item');
            }
            $when = $schedule($body['expected_return_date'] ?? $tx['expected_return_date'], $item['category']);

            $unitId = $tx['unit_id'] ? (int) $tx['unit_id'] : null;
            if (!$unitId) {   // older request made before units existed: give it a copy now
                $u = reserve_unit($pdo, (int) $item['id']);
                if (!$u) throw new InvalidArgumentException('All copies of this item are taken right now');
                $unitId = (int) $u['id'];
                $pdo->prepare('UPDATE transactions SET unit_id = ? WHERE id = ?')->execute([$unitId, $txId]);
            }
            set_unit_status($pdo, $unitId, 'borrowed');
            sync_stock($pdo, (int) $item['id']);
            $pdo->prepare("UPDATE transactions SET status = 'active', processed_by = ?, processed_at = NOW(), expected_return_date = ?,
                                  id_surrendered = ?, release_condition = ? WHERE id = ?")
                ->execute([$user['id'], $when->format('Y-m-d H:i:s'), $item['requires_id_surrender'] ? 1 : 0,
                           trim((string) ($body['item_condition'] ?? $item['item_condition'])), $txId]);
            $pdo->prepare("UPDATE cancellation_requests SET status = 'declined', resolved_by = ?, resolved_at = NOW()
                           WHERE transaction_id = ? AND status = 'pending'")->execute([$user['id'], $txId]);

            log_audit($user, 'Released Item', 'Transaction', $code, 'Released ' . $item['name'] . ' to ' . $student['full_name'], $meta);
            notify((int) $student['id'], "$firstName approved your {$item['name']} borrow request. Proceed to the SAO Office to claim the item. Thank you.", 'info', $txId);
            notify((int) $student['id'], "A Working Scholar set the {$item['name']} return schedule for " . $when->format('M j, Y \a\t g:i A') . '.', 'info', $txId);

        } elseif ($action === 'reject') {
            if ($tx['status'] !== 'pending') throw new InvalidArgumentException('Only pending requests can be rejected');
            $reason = trim((string) ($body['reject_reason'] ?? ''));
            $pdo->prepare("UPDATE transactions SET status = 'rejected', reject_reason = ?, processed_by = ?, processed_at = NOW() WHERE id = ?")
                ->execute([$reason !== '' ? $reason : null, $user['id'], $txId]);
            $pdo->prepare("UPDATE cancellation_requests SET status = 'accepted', resolved_by = ?, resolved_at = NOW()
                           WHERE transaction_id = ? AND status = 'pending'")->execute([$user['id'], $txId]);
            release_tx_unit($pdo, $tx);   // the copy goes back on the shelf

            log_audit($user, 'Rejected Request', 'Transaction', $code, $reason ?: 'Incomplete submission', $meta);
            notify((int) $student['id'], "Your {$item['name']} borrow request was rejected" . ($reason !== '' ? ": $reason" : '.'), 'alert', $txId);

        } elseif ($action === 'set_schedule') {
            if (!in_array($tx['status'], ['pending', 'active'], true)) throw new InvalidArgumentException('Only pending or active transactions can be scheduled');
            $when = $schedule($body['expected_return_date'] ?? null, $item['category']);
            $pdo->prepare('UPDATE transactions SET expected_return_date = ? WHERE id = ?')->execute([$when->format('Y-m-d H:i:s'), $txId]);
            // A new date makes the old "due/overdue" alerts obsolete.
            $pdo->prepare('DELETE FROM notifications WHERE transaction_id = ? AND alert_key IN (?, ?)')->execute([$txId, "due-$txId", "overdue-$txId"]);

            log_audit($user, 'Set Return Schedule', 'Transaction', $code, 'Return set to ' . $when->format('Y-m-d H:i'), $meta);
            notify((int) $student['id'], "A Working Scholar set the {$item['name']} return schedule for " . $when->format('M j, Y \a\t g:i A') . '.', 'info', $txId);

        } elseif ($action === 'return') {
            if ($tx['status'] !== 'active') throw new InvalidArgumentException('Only active borrowings can be returned');
            $cond = (string) ($body['return_condition'] ?? 'Good');
            if (!in_array($cond, ['Good', 'Damaged', 'Lost'], true)) {
                throw new InvalidArgumentException("return_condition must be 'Good', 'Damaged' or 'Lost'");
            }
            if ($tx['id_surrendered'] && empty($body['id_returned'])) {
                throw new InvalidArgumentException("Confirm that the student's ID was handed back");
            }
            $late = trim((string) ($body['late_notes'] ?? ''));

            // A lost copy stays out of stock (status 'lost'); anything else goes back on the shelf.
            $retUnit = $tx['unit_id'] ? (int) $tx['unit_id'] : null;
            if ($retUnit) {
                set_unit_status($pdo, $retUnit, $cond === 'Lost' ? 'lost' : 'available', $cond === 'Good' ? 'Good' : $cond);
                sync_stock($pdo, (int) $item['id']);
            } elseif ($cond !== 'Lost') {     // older borrowing without a unit
                $pdo->prepare('UPDATE inventories SET stock = stock + 1 WHERE id = ?')->execute([$item['id']]);
                sync_availability($pdo, (int) $item['id']);
            }
            $pdo->prepare("UPDATE transactions SET status = 'returned', returned_at = NOW(), received_by = ?, return_condition = ?,
                                  late_notes = ?, id_returned_at = ? WHERE id = ?")
                ->execute([$user['id'], $cond, $late !== '' ? mb_substr($late, 0, 500) : null,
                           $tx['id_surrendered'] ? date('Y-m-d H:i:s') : null, $txId]);

            $caseNo = null;
            if ($cond !== 'Good') {
                $caseNo = open_case($pdo, $tx, $cond, $late, $user);
            }
            log_audit($user, 'Returned Item', 'Transaction', $code, "{$item['name']} returned by {$student['full_name']} ($cond)",
                      ['type' => 'Return'] + $meta);
            notify((int) $student['id'], "Your return of {$item['name']} was recorded ($cond)." . ($caseNo ? ' An accountability case was opened.' : ''), $caseNo ? 'alert' : 'info', $txId);
            $pdo->commit();
            respond(['success' => true, 'action' => $action, 'case_id' => $caseNo ? case_code($caseNo) : null]);

        } elseif ($action === 'send_reminder') {
            if ($tx['status'] !== 'active') throw new InvalidArgumentException('Only active borrowings can be reminded');
            if (strtotime((string) $tx['expected_return_date']) >= time()) throw new InvalidArgumentException('This item is not overdue yet');
            if ($tx['last_reminder_at'] && strtotime($tx['last_reminder_at']) > time() - 3600) {
                throw new InvalidArgumentException('A reminder was already sent in the last hour', 429);
            }
            $pdo->prepare('UPDATE transactions SET last_reminder_at = NOW() WHERE id = ?')->execute([$txId]);
            log_audit($user, 'Sent Reminder', 'Transaction', $code, "Overdue reminder for {$item['name']}", $meta);
            notify((int) $student['id'], "Reminder: {$item['name']} is overdue. Please return it to the SAO Office immediately.", 'alert', $txId);

        } else {
            throw new InvalidArgumentException("action must be 'approve', 'reject', 'set_schedule', 'return', 'send_reminder' or 'manual_entry'");
        }

        $pdo->commit();
        respond(['success' => true, 'action' => $action, 'transaction_code' => $code]);
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $c = $e->getCode();
        respond(['error' => $e->getMessage()], $c >= 400 ? $c : 400);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['error' => 'Server error'], 500);
    }
}

respond(['error' => 'Method not allowed'], 405);
