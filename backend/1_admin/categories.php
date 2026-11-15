<?php
// Manage Categories & Category Rules (waiver, ID surrender, max active borrows per student).
// GET                      -> {categories:[{id,name,requires_waiver,requires_id_surrender,max_active_borrows,item_count,total_stock,is_core}]}
// POST   {name, requires_waiver?, requires_id_surrender?, max_active_borrows?}
// PUT    {id, name?, requires_waiver?, requires_id_surrender?, max_active_borrows?}   (renames cascade to items)
// DELETE {id}                                                                          (blocked if items use it)
require_once __DIR__ . '/../helpers.php';
$admin  = require_role('admin');
$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'];
const CORE_CATEGORIES = ['Academic', 'Non-Academic'];   // the Saturday rule and the UI tabs depend on these names

if ($method === 'GET') {
    $rows = $pdo->query(
        'SELECT c.id, c.name, c.requires_waiver, c.requires_id_surrender, c.max_active_borrows,
                COUNT(i.id) AS item_count, COALESCE(SUM(i.stock), 0) AS total_stock
         FROM categories c LEFT JOIN inventories i ON i.category = c.name
         GROUP BY c.id, c.name, c.requires_waiver, c.requires_id_surrender, c.max_active_borrows
         ORDER BY c.name'
    )->fetchAll();
    respond(['categories' => array_map(function ($r) {
        $r['is_core'] = in_array($r['name'], CORE_CATEGORIES, true);
        return $r;
    }, $rows)]);
}

$b = json_body();
$flag = fn($k, $d = 0) => array_key_exists($k, $b) ? (int) (bool) $b[$k] : $d;
$maxOk = fn($v) => $v >= 1 && $v <= 20;

if ($method === 'POST') {
    $name = trim((string) ($b['name'] ?? ''));
    $max  = (int) ($b['max_active_borrows'] ?? 2);
    if ($name === '' || mb_strlen($name) > 100) respond(['error' => 'Category name is required (max 100 characters)'], 400);
    if (!$maxOk($max)) respond(['error' => 'max_active_borrows must be between 1 and 20'], 400);
    try {
        $pdo->prepare('INSERT INTO categories (name, requires_waiver, requires_id_surrender, max_active_borrows) VALUES (?, ?, ?, ?)')
            ->execute([$name, $flag('requires_waiver'), $flag('requires_id_surrender'), $max]);
    } catch (PDOException $e) {
        respond(['error' => 'That category already exists'], 409);
    }
    $id = (int) $pdo->lastInsertId();
    log_audit($admin, 'Created Category', 'Category', $id, "Added category $name", ['type' => 'Category']);
    respond(['success' => true, 'id' => $id], 201);
}

if ($method === 'PUT') {
    $id = (int) ($b['id'] ?? 0);
    $s = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $s->execute([$id]);
    $c = $s->fetch();
    if (!$c) respond(['error' => 'Category not found'], 404);

    $name = trim((string) ($b['name'] ?? $c['name']));
    $max  = (int) ($b['max_active_borrows'] ?? $c['max_active_borrows']);
    if ($name === '' || mb_strlen($name) > 100) respond(['error' => 'Invalid category name'], 400);
    if (!$maxOk($max)) respond(['error' => 'max_active_borrows must be between 1 and 20'], 400);
    if ($name !== $c['name'] && in_array($c['name'], CORE_CATEGORIES, true)) respond(['error' => 'Academic and Non-Academic cannot be renamed'], 400);

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE categories SET name = ?, requires_waiver = ?, requires_id_surrender = ?, max_active_borrows = ? WHERE id = ?')
            ->execute([$name, $flag('requires_waiver', (int) $c['requires_waiver']),
                       $flag('requires_id_surrender', (int) $c['requires_id_surrender']), $max, $id]);
        if ($name !== $c['name']) {
            $pdo->prepare('UPDATE inventories SET category = ? WHERE category = ?')->execute([$name, $c['name']]);
        }
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(['error' => 'That category name is already used'], 409);
    }
    log_audit($admin, 'Updated Category', 'Category', $id, "Updated rules for $name", ['type' => 'Category']);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    $id = (int) ($b['id'] ?? 0);
    $s = $pdo->prepare('SELECT name FROM categories WHERE id = ?');
    $s->execute([$id]);
    $name = $s->fetchColumn();
    if (!$name) respond(['error' => 'Category not found'], 404);
    if (in_array($name, CORE_CATEGORIES, true)) respond(['error' => 'Academic and Non-Academic cannot be deleted'], 400);
    $u = $pdo->prepare('SELECT COUNT(*) FROM inventories WHERE category = ?');
    $u->execute([$name]);
    if ((int) $u->fetchColumn() > 0) respond(['error' => 'Move or remove the items in this category first'], 409);
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    log_audit($admin, 'Deleted Category', 'Category', $id, "Removed category $name", ['type' => 'Category']);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
