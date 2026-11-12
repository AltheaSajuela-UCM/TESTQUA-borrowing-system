<?php
require_once __DIR__ . '/../auth.php';
$user = require_role('student');

// GET  : list items that can be borrowed (?category=Academic&q=calc)
// POST : request an item  {item_id, expected_return_date}  -> status 'pending'
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql    = 'SELECT id, item_code, name, category, stock, item_condition
               FROM inventories WHERE is_available = 1 AND stock > 0';
    $params = [];
    if (!empty($_GET['category'])) {
        $sql .= ' AND category = ?';
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['q'])) {
        $sql .= ' AND name LIKE ?';
        $params[] = '%' . $_GET['q'] . '%';
    }
    $sql .= ' ORDER BY name';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    respond(['items' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_body();
    $itemId = (int) ($body['item_id'] ?? 0);
    $date   = date_create((string) ($body['expected_return_date'] ?? ''));

    if ($itemId < 1 || !$date) {
        respond(['error' => 'item_id and a valid expected_return_date are required'], 400);
    }
    if ($date < new DateTime('now')) {
        respond(['error' => 'Return date must be in the future'], 400);
    }

    $stmt = db()->prepare('SELECT * FROM inventories WHERE id = ?');
    $stmt->execute([$itemId]);
    $item = $stmt->fetch();
    if (!$item || !$item['is_available'] || $item['stock'] < 1) {
        respond(['error' => 'Item is unavailable'], 409);
    }

    $dup = db()->prepare(
        "SELECT 1 FROM transactions
         WHERE user_id = ? AND inventory_id = ? AND status IN ('pending','active')"
    );
    $dup->execute([$user['id'], $itemId]);
    if ($dup->fetchColumn()) {
        respond(['error' => 'You already have a pending or active request for this item'], 409);
    }

    // Stock is only reduced when a working scholar approves the request.
    db()->prepare(
        "INSERT INTO transactions (user_id, inventory_id, status, expected_return_date)
         VALUES (?, ?, 'pending', ?)"
    )->execute([$user['id'], $itemId, $date->format('Y-m-d H:i:s')]);

    respond(['success' => true, 'transaction_id' => (int) db()->lastInsertId(), 'status' => 'pending'], 201);
}

respond(['error' => 'Method not allowed'], 405);