<?php
// My Borrowings (active, pending, history) + Cancel Borrow Request.
// GET  ?status=pending|active|returned|rejected|cancelled
// POST {transaction_id, action:'cancel', reason?}
//      A student cannot cancel by themselves: this files a CANCELLATION REQUEST that a Working Scholar accepts or
//      declines (Working Scholar > Cancellation Requests). Only still-pending requests can be cancelled.
require_once __DIR__ . '/../helpers.php';
$user = require_role('student');
$pdo  = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    generate_due_alerts($pdo, (int) $user['id']);
    $sql = 'SELECT t.id, t.status, t.requested_at, t.processed_at, t.expected_return_date,
                   t.returned_at, t.reject_reason, t.return_condition, t.waiver_accepted_at, t.id_surrendered,
                   i.item_code, un.unit_code, i.name AS item_name, i.category,
                   (t.status = "active" AND t.expected_return_date < NOW()) AS is_overdue,
                   EXISTS(SELECT 1 FROM cancellation_requests cr WHERE cr.transaction_id = t.id AND cr.status = "pending") AS cancel_requested
            FROM transactions t JOIN inventories i ON i.id = t.inventory_id
            LEFT JOIN item_units un ON un.id = t.unit_id
            WHERE t.user_id = ?';
    $p = [$user['id']];
    if (!empty($_GET['status'])) { $sql .= ' AND t.status = ?'; $p[] = $_GET['status']; }
    $stmt = $pdo->prepare($sql . ' ORDER BY t.requested_at DESC');
    $stmt->execute($p);
    respond(['borrowings' => array_map(function ($r) {
        $r['transaction_code'] = tx_code((int) $r['id']);
        $r['display_status']   = tx_display_status($r);
        return $r;
    }, $stmt->fetchAll())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = json_body();
    if (($b['action'] ?? '') !== 'cancel') respond(['error' => "Only action 'cancel' is allowed"], 400);
    $txId = (int) ($b['transaction_id'] ?? 0);

    $s = $pdo->prepare("SELECT t.id, t.status, i.name AS item_name FROM transactions t JOIN inventories i ON i.id = t.inventory_id
                        WHERE t.id = ? AND t.user_id = ?");
    $s->execute([$txId, $user['id']]);
    $tx = $s->fetch();
    if (!$tx)                         respond(['error' => 'Request not found'], 404);
    if ($tx['status'] !== 'pending')  respond(['error' => 'Only pending requests can be cancelled. Items already released must be returned.'], 409);

    $dup = $pdo->prepare("SELECT 1 FROM cancellation_requests WHERE transaction_id = ? AND status = 'pending'");
    $dup->execute([$txId]);
    if ($dup->fetchColumn()) respond(['error' => 'A cancellation request was already sent for this borrow request'], 409);

    $pdo->prepare('INSERT INTO cancellation_requests (transaction_id, user_id, reason) VALUES (?, ?, ?)')
        ->execute([$txId, $user['id'], mb_substr(trim((string) ($b['reason'] ?? '')), 0, 500) ?: null]);
    $crId = (int) $pdo->lastInsertId();

    log_audit($user, 'Requested Cancellation', 'Transaction', tx_code($txId), 'Asked to cancel ' . $tx['item_name'],
              ['type' => 'Cancellation Request', 'student' => $user['full_name'], 'item' => $tx['item_name']]);
    notify_role('working_scholar', $user['full_name'] . ' asked to cancel the ' . $tx['item_name'] . ' request.', 'info', $txId);

    respond(['success' => true, 'status' => 'cancellation_requested', 'request_code' => canc_code($crId),
             'message' => 'Cancellation request sent. A Working Scholar will review it.'], 201);
}

respond(['error' => 'Method not allowed'], 405);
