<?php
require_once __DIR__ . '/../auth.php';
require_role('working_scholar');
/** @var PDO $pdo */
header('Content-Type: application/json');

if (($_SESSION['role'] ?? '') !== 'working_scholar') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

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
echo json_encode(['success' => true, 'items' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);