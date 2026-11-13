<?php
require_once __DIR__ . '/../auth.php';
require_role('admin');
/** @var PDO $pdo */
header('Content-Type: application/json');

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}
if (($_SESSION['role'] ?? '') !== 'admin') {
    respond(['success' => false, 'message' => 'Forbidden'], 403);
}

const CATEGORIES = ['Academic', 'Non-Academic'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = 'SELECT id, item_code, name, category, stock, item_condition, is_available
            FROM inventories WHERE 1=1';
    $params = [];
    if (!empty($_GET['category'])) {
        $sql .= ' AND category = ?';
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['search'])) {
        $sql .= ' AND (name LIKE ? OR item_code LIKE ?)';
        $like = '%' . $_GET['search'] . '%';
        array_push($params, $like, $like);
    }
    $sql .= ' ORDER BY category, name';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(['success' => true, 'items' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Method not allowed'], 405);
}

$in = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $in['action'] ?? '';

try {
    if ($action === 'create' || $action === 'update') {
        $code  = trim($in['item_code'] ?? '');
        $name  = trim($in['name'] ?? '');
        $cat   = $in['category'] ?? '';
        $stock = filter_var($in['stock'] ?? null, FILTER_VALIDATE_INT);
        $cond  = trim($in['item_condition'] ?? 'Good');

        if ($code === '' || $name === '' || !in_array($cat, CATEGORIES, true)
            || $stock === false || $stock < 0) {
            respond(['success' => false, 'message' => 'Invalid item data'], 422);
        }

        if ($action === 'create') {
            $stmt = $pdo->prepare('INSERT INTO inventories
                (item_code, name, category, stock, item_condition, is_available)
                VALUES (?, ?, ?, ?, ?, 1)');
            $stmt->execute([$code, $name, $cat, $stock, $cond]);
            respond(['success' => true, 'id' => (int)$pdo->lastInsertId()], 201);
        }

        $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) respond(['success' => false, 'message' => 'Missing id'], 422);
        $stmt = $pdo->prepare('UPDATE inventories
            SET item_code = ?, name = ?, category = ?, stock = ?, item_condition = ?
            WHERE id = ?');
        $stmt->execute([$code, $name, $cat, $stock, $cond, $id]);
        respond(['success' => true]);
    }

    if ($action === 'set_available') {
        $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) respond(['success' => false, 'message' => 'Missing id'], 422);
        $flag = !empty($in['is_available']) ? 1 : 0;
        $pdo->prepare('UPDATE inventories SET is_available = ? WHERE id = ?')
            ->execute([$flag, $id]);
        respond(['success' => true]);
    }

    respond(['success' => false, 'message' => 'Unknown action'], 400);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        respond(['success' => false, 'message' => 'Item code already exists'], 409);
    }
    respond(['success' => false, 'message' => 'Database error'], 500);
}