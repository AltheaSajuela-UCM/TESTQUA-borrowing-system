<?php
require_once __DIR__ . '/../helpers.php';
$user = require_role('working_scholar');
$pdo  = db();

// GET  : student cancellation requests (?status=pending|accepted|declined|all, default pending)
// POST : {request_id, action:'accept'|'decline'}
//        accept -> the borrow request becomes 'cancelled' and the student is notified
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? 'pending';
    $sql = 'SELECT cr.id, cr.transaction_id, cr.reason, cr.status, cr.requested_at, cr.resolved_at,
                   u.full_name AS student_name, u.id_number AS student_id,
                   i.name AS item_name, i.item_code
            FROM cancellation_requests cr
            JOIN transactions t ON t.id = cr.transaction_id
            JOIN users u ON u.id = cr.user_id
            JOIN inventories i ON i.id = t.inventory_id';
    $p = [];
    if ($status !== 'all') { $sql .= ' WHERE cr.status = ?'; $p[] = $status; }
    $stmt = $pdo->prepare($sql . ' ORDER BY cr.requested_at DESC');
    $stmt->execute($p);
    respond(['cancellations' => array_map(function ($r) {
        $r['request_code']     = canc_code((int) $r['id']);
        $r['transaction_code'] = tx_code((int) $r['transaction_id']);
        return $r;
    }, $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b      = json_body();
    $reqId  = (int) ($b['request_id'] ?? 0);
    $action = (string) ($b['action'] ?? '');
    if (!in_array($action, ['accept', 'decline'], true)) respond(['error' => "action must be 'accept' or 'decline'"], 400);

    $pdo->beginTransaction();
    try {
        $s = $pdo->prepare('SELECT * FROM cancellation_requests WHERE id = ? FOR UPDATE');
        $s->execute([$reqId]);
        $cr = $s->fetch();
        if (!$cr) throw new InvalidArgumentException('Cancellation request not found');
        if ($cr['status'] !== 'pending') throw new InvalidArgumentException('This request was already handled');

        $s = $pdo->prepare('SELECT t.*, i.name AS item_name, u.full_name AS student_name
                            FROM transactions t JOIN inventories i ON i.id = t.inventory_id JOIN users u ON u.id = t.user_id
                            WHERE t.id = ? FOR UPDATE');
        $s->execute([$cr['transaction_id']]);
        $tx = $s->fetch();
        $meta = ['type' => 'Cancellation Request', 'student' => $tx['student_name'], 'item' => $tx['item_name']];

        if ($action === 'accept') {
            if ($tx['status'] !== 'pending') {
                throw new InvalidArgumentException('The item was already released, so this request cannot be cancelled');
            }
            $pdo->prepare("UPDATE transactions SET status = 'cancelled', processed_by = ?, processed_at = NOW() WHERE id = ?")
                ->execute([$user['id'], $tx['id']]);
            $pdo->prepare("UPDATE cancellation_requests SET status = 'accepted', resolved_by = ?, resolved_at = NOW() WHERE id = ?")
                ->execute([$user['id'], $reqId]);
            log_audit($user, 'Accepted Cancellation', 'Transaction', tx_code((int) $tx['id']), 'Cancelled ' . $tx['item_name'], $meta);
            notify((int) $tx['user_id'], 'Your request for ' . $tx['item_name'] . ' was cancelled.', 'info', (int) $tx['id']);
        } else {
            $pdo->prepare("UPDATE cancellation_requests SET status = 'declined', resolved_by = ?, resolved_at = NOW() WHERE id = ?")
                ->execute([$user['id'], $reqId]);
            log_audit($user, 'Declined Cancellation', 'Transaction', tx_code((int) $tx['id']), 'Kept ' . $tx['item_name'], $meta);
            notify((int) $tx['user_id'], 'Your cancellation request for ' . $tx['item_name'] . ' was declined. The request is still pending.', 'info', (int) $tx['id']);
        }
        $pdo->commit();
        respond(['success' => true, 'action' => $action]);
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['error' => $e->getMessage()], 400);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['error' => 'Server error'], 500);
    }
}

respond(['error' => 'Method not allowed'], 405);
