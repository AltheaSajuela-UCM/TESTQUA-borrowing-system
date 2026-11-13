<?php
require_once __DIR__ . '/../auth.php';
require_role('student');
header('Content-Type: application/json');

$sql = 'SELECT id, item_code, name, category, stock, item_condition, is_available
        FROM inventories WHERE 1=1 AND is_available = 1';
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