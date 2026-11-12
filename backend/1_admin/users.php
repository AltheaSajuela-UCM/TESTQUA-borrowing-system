<?php
require_once __DIR__ . '/../auth.php';
$admin = require_role('admin');

// GET  : list users (?role=student&q=2024)
// POST : create  {id_number, full_name, role, mobile_number?, password}
// PUT  : update  {id, full_name?, role?, mobile_number?, is_active?, password?}
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = db();
$roles  = ['admin', 'working_scholar', 'student'];

if ($method === 'GET') {
    $sql = 'SELECT id, id_number, full_name, role, mobile_number, is_active, created_at FROM users WHERE 1=1';
    $params = [];
    if (!empty($_GET['role'])) { $sql .= ' AND role = ?'; $params[] = $_GET['role']; }
    if (!empty($_GET['q']))    { $sql .= ' AND (full_name LIKE ? OR id_number LIKE ?)'; $params[] = '%' . $_GET['q'] . '%'; $params[] = '%' . $_GET['q'] . '%'; }
    $stmt = $pdo->prepare($sql . ' ORDER BY role, full_name');
    $stmt->execute($params);
    respond(['users' => $stmt->fetchAll()]);
}

$body = json_body();

if ($method === 'POST') {
    $idNumber = trim((string) ($body['id_number'] ?? ''));
    $name     = trim((string) ($body['full_name'] ?? ''));
    $role     = (string) ($body['role'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $mobile   = trim((string) ($body['mobile_number'] ?? ''));

    if ($idNumber === '' || $name === '' || !in_array($role, $roles, true)) {
        respond(['error' => 'id_number, full_name and a valid role are required'], 400);
    }
    if (strlen($password) < 8) respond(['error' => 'Password must be at least 8 characters'], 400);

    $check = $pdo->prepare('SELECT 1 FROM users WHERE id_number = ?');
    $check->execute([$idNumber]);
    if ($check->fetchColumn()) respond(['error' => 'ID number already exists'], 409);

    $pdo->prepare('INSERT INTO users (id_number, full_name, role, mobile_number, password_hash) VALUES (?, ?, ?, ?, ?)')
        ->execute([$idNumber, $name, $role, $mobile ?: null, password_hash($password, PASSWORD_DEFAULT)]);
    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    $id = (int) ($body['id'] ?? 0);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) respond(['error' => 'User not found'], 404);

    $name   = trim((string) ($body['full_name'] ?? $target['full_name']));
    $role   = (string) ($body['role'] ?? $target['role']);
    $mobile = array_key_exists('mobile_number', $body) ? (trim((string) $body['mobile_number']) ?: null) : $target['mobile_number'];
    $active = array_key_exists('is_active', $body) ? (int) (bool) $body['is_active'] : (int) $target['is_active'];

    if ($name === '' || !in_array($role, $roles, true)) respond(['error' => 'Invalid name or role'], 400);

    // An admin must not lock themselves out.
    if ($id === (int) $admin['id'] && ($role !== 'admin' || !$active)) {
        respond(['error' => 'You cannot demote or deactivate your own account'], 400);
    }

    $pdo->prepare('UPDATE users SET full_name=?, role=?, mobile_number=?, is_active=? WHERE id=?')
        ->execute([$name, $role, $mobile, $active, $id]);

    if (!empty($body['password'])) {
        if (strlen((string) $body['password']) < 8) respond(['error' => 'Password must be at least 8 characters'], 400);
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash((string) $body['password'], PASSWORD_DEFAULT), $id]);
    }
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);