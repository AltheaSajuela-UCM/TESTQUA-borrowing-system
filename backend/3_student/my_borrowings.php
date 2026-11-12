<?php
require_once __DIR__ . '/../auth.php';
$user = require_role('student');

// GET  : my transactions (?status=pending|active|returned|rejected|cancelled)
// POST : {transaction_id, action:'cancel'} cancels my own pending request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = 'SELECT t.id, t.status, t.requested_at, t.processed_at, t.expected_return_date,
                   t.returned_at, t.reject_reason, t.return_condition,
                   i.item_code, i.name AS item_name, i.category,
                   (t.status = "active" AND t.expected_return_date < NOW()) AS is_overdue
            FROM transactions t JOIN inventories i ON i.id = t.inventory_id
            WHERE t.user_id = ?';
    $params = [$user['id']];
    if (!empty($_GET['status'])) {
        $sql .= ' AND t.status = ?';
        $params[] = $_GET['status'];
    }
    $sql .= ' ORDER BY t.requested_at DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    respond(['borrowings' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_body();
    if (($body['action'] ?? '') !== 'cancel') {
        respond(['error' => "Only action 'cancel' is allowed"], 400);
    }
    $stmt = db()->prepare(
        "UPDATE transactions SET status = 'cancelled'
         WHERE id = ? AND user_id = ? AND status = 'pending'"
    );
    $stmt->execute([(int) ($body['transaction_id'] ?? 0), $user['id']]);
    if ($stmt->rowCount() === 0) {
        respond(['error' => 'No pending request found to cancel'], 404);
    }
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);