<?php
// Admin inventory: Manage Inventory (Academic / Non-Academic tabs), Add / Edit Items, Update Borrowing Rules
// (waiver / ID surrender per item), Update Availability & Stock. Categories come from the categories table.
//
// GET    ?category=&q=|search=&status=Available|Under Maintenance|Unavailable  -> {success, items}
// POST   {item_code, name, category, stock, item_condition?, description?, availability_status?,
//         requires_waiver?: 0|1|null, requires_id_surrender?: 0|1|null}       (null = inherit from the category)
// PUT    {id, ...same fields, all optional}
// POST   {action:'update', id, ...}  and  {action:'set_available', id, is_available}  (older front-end calls still work)
// DELETE {id}   blocked when the item has borrowing history (set stock to 0 / Unavailable instead)
require_once __DIR__ . '/../helpers.php';
$admin  = require_role('admin');
$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = 'SELECT ' . ITEM_SELECT . ', i.requires_waiver AS waiver_override, i.requires_id_surrender AS id_override ' . ITEM_FROM . ' WHERE 1=1';
    $p = [];
    if (!empty($_GET['category'])) { $sql .= ' AND i.category = ?'; $p[] = $_GET['category']; }
    if (!empty($_GET['status']))   { $sql .= ' AND i.availability_status = ?'; $p[] = $_GET['status']; }
    $q = $_GET['q'] ?? $_GET['search'] ?? '';
    if ($q !== '') {
        $sql .= ' AND (i.name LIKE ? OR i.item_code LIKE ? OR i.description LIKE ?)';
        array_push($p, "%$q%", "%$q%", "%$q%");
    }
    $stmt = $pdo->prepare($sql . ' ORDER BY i.category, i.name');
    $stmt->execute($p);
    respond(['success' => true, 'items' => array_map('decorate_item', $stmt->fetchAll())]);
}

$b      = json_body();
$action = (string) ($b['action'] ?? '');
if ($method === 'POST' && in_array($action, ['update', 'set_available'], true)) $method = 'PUT';

// null / '' / 'inherit' -> NULL (inherit); anything else -> 0/1
$tri = fn($v) => ($v === null || $v === '' || $v === 'inherit') ? null : (int) (bool) $v;

if ($method === 'POST') {
    $code  = trim((string) ($b['item_code'] ?? ''));
    $name  = trim((string) ($b['name'] ?? ''));
    $cat   = trim((string) ($b['category'] ?? ''));
    $stock = filter_var($b['stock'] ?? 0, FILTER_VALIDATE_INT);
    $cond  = trim((string) ($b['item_condition'] ?? 'Good')) ?: 'Good';
    $stat  = (string) ($b['availability_status'] ?? 'Available');
    if ($code === '' || $name === '')                 respond(['error' => 'item_code and name are required'], 400);
    if (!in_array($cat, category_names(), true))      respond(['error' => 'Unknown category'], 400);
    if ($stock === false || $stock < 0)               respond(['error' => 'Stock must be 0 or more'], 400);
    if (!in_array($stat, AVAILABILITY_STATUSES, true)) respond(['error' => 'Invalid availability_status'], 400);
    try {
        $pdo->prepare('INSERT INTO inventories (item_code, name, category, description, stock, item_condition, availability_status,
                                                requires_waiver, requires_id_surrender, is_available)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
            ->execute([$code, $name, $cat, trim((string) ($b['description'] ?? '')) ?: null, $stock, $cond, $stat,
                       $tri($b['requires_waiver'] ?? null), $tri($b['requires_id_surrender'] ?? null)]);
    } catch (PDOException $e) {
        respond(['error' => 'Item code already exists'], 409);
    }
    $id = (int) $pdo->lastInsertId();
    sync_availability($pdo, $id);
    log_audit($admin, 'Added Item', 'Item', $id, "Added $name ($code), stock $stock", ['type' => 'Item Update', 'item' => $name]);
    respond(['success' => true, 'id' => $id], 201);
}

if ($method === 'PUT') {
    $id = filter_var($b['id'] ?? null, FILTER_VALIDATE_INT);
    $s = $pdo->prepare('SELECT * FROM inventories WHERE id = ?');
    $s->execute([$id]);
    $it = $s->fetch();
    if (!$it) respond(['error' => 'Item not found'], 404);

    $stat = $it['availability_status'];
    if ($action === 'set_available') {
        $stat = !empty($b['is_available']) ? 'Available' : 'Unavailable';
    } elseif (isset($b['availability_status'])) {
        $stat = (string) $b['availability_status'];
    }
    $code  = trim((string) ($b['item_code'] ?? $it['item_code']));
    $name  = trim((string) ($b['name'] ?? $it['name']));
    $cat   = trim((string) ($b['category'] ?? $it['category']));
    $stock = filter_var($b['stock'] ?? $it['stock'], FILTER_VALIDATE_INT);
    $cond  = trim((string) ($b['item_condition'] ?? $it['item_condition'])) ?: 'Good';
    $desc  = array_key_exists('description', $b) ? (trim((string) $b['description']) ?: null) : $it['description'];
    $wv    = array_key_exists('requires_waiver', $b) ? $tri($b['requires_waiver']) : $it['requires_waiver'];
    $ids   = array_key_exists('requires_id_surrender', $b) ? $tri($b['requires_id_surrender']) : $it['requires_id_surrender'];

    if ($code === '' || $name === '')                  respond(['error' => 'item_code and name cannot be empty'], 400);
    if (!in_array($cat, category_names(), true))       respond(['error' => 'Unknown category'], 400);
    if ($stock === false || $stock < 0)                respond(['error' => 'Stock must be 0 or more'], 400);
    if (!in_array($stat, AVAILABILITY_STATUSES, true)) respond(['error' => 'Invalid availability_status'], 400);

    try {
        $pdo->prepare('UPDATE inventories SET item_code=?, name=?, category=?, description=?, stock=?, item_condition=?,
                              availability_status=?, requires_waiver=?, requires_id_surrender=? WHERE id=?')
            ->execute([$code, $name, $cat, $desc, $stock, $cond, $stat, $wv, $ids, $id]);
    } catch (PDOException $e) {
        respond(['error' => 'Item code already exists'], 409);
    }
    sync_availability($pdo, (int) $id);

    $changes = [];
    if ((int) $it['stock'] !== $stock)           $changes[] = "stock {$it['stock']} -> $stock";
    if ($it['availability_status'] !== $stat)    $changes[] = "status {$it['availability_status']} -> $stat";
    if ($it['category'] !== $cat)                $changes[] = "category $cat";
    if ($it['requires_waiver'] !== $wv || $it['requires_id_surrender'] !== $ids) $changes[] = 'borrowing rules';
    log_audit($admin, $it['availability_status'] !== $stat ? 'Updated Availability' : 'Edited Item', 'Item', $id,
              $changes ? implode(', ', $changes) : 'Details edited', ['type' => 'Item Update', 'item' => $name]);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    $id = (int) ($b['id'] ?? 0);
    $s = $pdo->prepare('SELECT name FROM inventories WHERE id = ?');
    $s->execute([$id]);
    $name = $s->fetchColumn();
    if (!$name) respond(['error' => 'Item not found'], 404);
    $u = $pdo->prepare('SELECT 1 FROM transactions WHERE inventory_id = ? LIMIT 1');
    $u->execute([$id]);
    if ($u->fetchColumn()) respond(['error' => 'Item has borrowing history; mark it Unavailable or set its stock to 0 instead'], 409);
    $pdo->prepare('DELETE FROM inventories WHERE id = ?')->execute([$id]);
    log_audit($admin, 'Deleted Item', 'Item', $id, "Removed $name", ['type' => 'Item Update', 'item' => $name]);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
