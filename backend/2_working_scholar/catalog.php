<?php
require_once __DIR__ . '/../helpers.php';
$user = require_role('working_scholar');

// View Inventory (modules list: read-only for Working Scholars).
// GET ?category=Academic&search=calc
//
// The WS inventory page has an "Edit Status" button, so editing is ON by default:
//   POST {id, availability_status: Available|Borrowed|Under Maintenance|Damaged|Missing|Unavailable}
// To make the view read-only again, add  'ws_can_edit_status' => false  to backend/config.php.
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!app_setting('ws_can_edit_status', true)) {
        respond(['success' => false, 'error' => 'Inventory is read-only for Working Scholars'], 403);
    }
    $b = json_body();
    $status = (string) ($b['availability_status'] ?? '');
    if (!in_array($status, AVAILABILITY_STATUSES, true)) respond(['error' => 'Invalid availability_status'], 400);
    $id = (int) ($b['id'] ?? 0);
    $it = $pdo->prepare('SELECT name FROM inventories WHERE id = ?');
    $it->execute([$id]);
    if (!($name = $it->fetchColumn())) respond(['error' => 'Item not found'], 404);

    $pdo->prepare('UPDATE inventories SET availability_status = ? WHERE id = ?')->execute([$status, $id]);
    sync_availability($pdo, $id);
    log_audit($user, 'Updated Availability', 'Item', $id, "Changed status to $status", ['type' => 'Item Update', 'item' => $name]);
    respond(['success' => true]);
}
require_method('GET');

$sql = 'SELECT ' . ITEM_SELECT . ' ' . ITEM_FROM . ' WHERE 1=1';
$params = [];
if (!empty($_GET['category'])) { $sql .= ' AND i.category = ?'; $params[] = $_GET['category']; }
if (!empty($_GET['search'])) {
    $sql .= ' AND (i.name LIKE ? OR i.item_code LIKE ?)';
    $like = '%' . $_GET['search'] . '%';
    array_push($params, $like, $like);
}
$stmt = $pdo->prepare($sql . ' ORDER BY i.category, i.name');
$stmt->execute($params);
respond(['success' => true, 'items' => array_map('decorate_item', $stmt->fetchAll())]);