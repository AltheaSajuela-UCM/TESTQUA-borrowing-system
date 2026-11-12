<?php
require_once __DIR__ . '/../auth.php';
require_role('admin');

// GET    : list items (?category=&q=)
// POST   : create  {item_code, name, category, stock, item_condition}
// PUT    : update  {id, name?, category?, stock?, item_condition?}
// DELETE : remove  {id}  (blocked if the item has borrowing history)
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = db();
$categories = ['Academic', 'Non-Academic'];   // inventories.category is an ENUM of these two

if ($method === 'GET') {
    $sql = 'SELECT * FROM inventories WHERE 1=1';
    $params = [];
    if (!empty($_GET['category'])) { $sql .= ' AND category = ?'; $params[] = $_GET['category']; }
    if (!empty($_GET['q']))        { $sql .= ' AND (name LIKE ? OR item_code LIKE ?)'; $params[] = '%' . $_GET['q'] . '%'; $params[] = '%' . $_GET['q'] . '%'; }
    $stmt = $pdo->prepare($sql . ' ORDER BY name');
    $stmt->execute($params);
    respond(['items' => $stmt->fetchAll()]);
}

$body = json_body();

if ($method === 'POST') {
    $code = trim((string) ($body['item_code'] ?? ''));
    $name = trim((string) ($body['name'] ?? ''));
    $cat  = trim((string) ($body['category'] ?? ''));
    $stock = (int) ($body['stock'] ?? 0);
    $cond  = trim((string) ($body['item_condition'] ?? 'Good'));
    if ($code === '' || $name === '' || !in_array($cat, $categories, true) || $stock < 0) {
        respond(['error' => "item_code, name, a category of 'Academic' or 'Non-Academic', and a non-negative stock are required"], 400);
    }
    try {
        $pdo->prepare('INSERT INTO inventories (item_code, name, category, stock, item_condition, is_available)
                       VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$code, $name, $cat, $stock, $cond, $stock > 0 ? 1 : 0]);
    } catch (PDOException $e) {
        respond(['error' => 'Item code already exists'], 409);
    }
    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? 0);
    $stmt = $pdo->prepare('SELECT * FROM inventories WHERE id = ?');
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    if (!$item) respond(['error' => 'Item not found'], 404);

    $name  = trim((string) ($body['name'] ?? $item['name']));
    $cat   = trim((string) ($body['category'] ?? $item['category']));
    $stock = (int) ($body['stock'] ?? $item['stock']);
    $cond  = trim((string) ($body['item_condition'] ?? $item['item_condition']));
    if ($name === '' || !in_array($cat, $categories, true) || $stock < 0) respond(['error' => 'Invalid values (category must be Academic or Non-Academic)'], 400);

    $pdo->prepare('UPDATE inventories SET name=?, category=?, stock=?, item_condition=?, is_available=? WHERE id=?')
        ->execute([$name, $cat, $stock, $cond, $stock > 0 ? 1 : 0, $id]);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    $id = (int) ($body['id'] ?? 0);
    $used = $pdo->prepare('SELECT 1 FROM transactions WHERE inventory_id = ? LIMIT 1');
    $used->execute([$id]);
    if ($used->fetchColumn()) {
        respond(['error' => 'Item has borrowing history; set its stock to 0 instead'], 409);
    }
    $pdo->prepare('DELETE FROM inventories WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);