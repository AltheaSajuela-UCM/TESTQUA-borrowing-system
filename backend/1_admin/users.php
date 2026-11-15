<?php
// Manage Users (students & working scholars) + Admin account management. Every change is written to the audit trail.
// GET  ?role=&q=&status=active|inactive|flagged     POST create     PUT update (incl. activate / deactivate)
//   create: {id_number(8 digits), full_name, role, password, mobile_number?, email?, campus?, academic_level?, program_year?}
//   update: {id, full_name?, role?, mobile_number?, email?, campus?, academic_level?, program_year?,
//            is_active?, clear_flag?, password?}
require_once __DIR__ . '/../helpers.php';
$admin  = require_role('admin');
$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'];
$roles  = ['admin', 'working_scholar', 'student'];

if ($method === 'GET') {
    $sql = 'SELECT id, id_number, full_name, email, role, mobile_number, campus, academic_level, program_year,
                   is_active, is_flagged, created_at FROM users WHERE 1=1';
    $p = [];
    if (!empty($_GET['role'])) { $sql .= ' AND role = ?'; $p[] = $_GET['role']; }
    if (!empty($_GET['q']))    { $sql .= ' AND (full_name LIKE ? OR id_number LIKE ?)'; array_push($p, '%' . $_GET['q'] . '%', '%' . $_GET['q'] . '%'); }
    $st = $_GET['status'] ?? '';
    if ($st === 'active')   $sql .= ' AND is_active = 1';
    if ($st === 'inactive') $sql .= ' AND is_active = 0';
    if ($st === 'flagged')  $sql .= ' AND is_flagged = 1';
    $stmt = $pdo->prepare($sql . ' ORDER BY role, full_name');
    $stmt->execute($p);
    respond(['users' => $stmt->fetchAll()]);
}

$b = json_body();

if ($method === 'POST') {
    $idNumber = trim((string) ($b['id_number'] ?? ''));
    $name     = trim((string) ($b['full_name'] ?? ''));
    $role     = (string) ($b['role'] ?? '');
    $password = (string) ($b['password'] ?? '');
    $mobile   = trim((string) ($b['mobile_number'] ?? ''));
    $email    = trim((string) ($b['email'] ?? ''));
    $campus   = trim((string) ($b['campus'] ?? ''));

    if (!preg_match('/^\d{8}$/', $idNumber))          respond(['error' => 'ID number must be exactly 8 digits'], 400);
    if ($name === '' || !in_array($role, $roles, true)) respond(['error' => 'full_name and a valid role are required'], 400);
    if (strlen($password) < 8)                        respond(['error' => 'Password must be at least 8 characters'], 400);
    if ($mobile !== '' && !preg_match('/^[0-9+\-\s]{7,20}$/', $mobile)) respond(['error' => 'Invalid mobile number'], 400);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))    respond(['error' => 'Invalid email address'], 400);
    if ($campus !== '' && !in_array($campus, ALLOWED_CAMPUSES, true))   respond(['error' => 'Unknown campus'], 400);

    try {
        $pdo->prepare('INSERT INTO users (id_number, full_name, email, role, mobile_number, campus, academic_level, program_year, password_hash)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$idNumber, $name, $email ?: null, $role, $mobile ?: null, $campus ?: null,
                       trim((string) ($b['academic_level'] ?? '')) ?: null, trim((string) ($b['program_year'] ?? '')) ?: null,
                       password_hash($password, PASSWORD_DEFAULT)]);
    } catch (PDOException $e) {
        respond(['error' => 'ID number or email already exists'], 409);
    }
    $id = (int) $pdo->lastInsertId();
    log_audit($admin, 'Created User', 'User', $idNumber, "Created $role account for $name", ['type' => 'User', 'student' => $name]);
    respond(['success' => true, 'id' => $id], 201);
}

if ($method === 'PUT') {
    $id = (int) ($b['id'] ?? 0);
    $s = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $s->execute([$id]);
    $t = $s->fetch();
    if (!$t) respond(['error' => 'User not found'], 404);

    $get = fn($k, $cur) => array_key_exists($k, $b) ? (trim((string) $b[$k]) ?: null) : $cur;
    $name   = trim((string) ($b['full_name'] ?? $t['full_name']));
    $role   = (string) ($b['role'] ?? $t['role']);
    $mobile = $get('mobile_number', $t['mobile_number']);
    $email  = $get('email', $t['email']);
    $campus = $get('campus', $t['campus']);
    $level  = $get('academic_level', $t['academic_level']);
    $prog   = $get('program_year', $t['program_year']);
    $active = array_key_exists('is_active', $b) ? (int) (bool) $b['is_active'] : (int) $t['is_active'];
    $flag   = !empty($b['clear_flag']) ? 0 : (int) $t['is_flagged'];

    if ($name === '' || !in_array($role, $roles, true)) respond(['error' => 'Invalid name or role'], 400);
    if ($mobile && !preg_match('/^[0-9+\-\s]{7,20}$/', $mobile)) respond(['error' => 'Invalid mobile number'], 400);
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL))    respond(['error' => 'Invalid email address'], 400);
    if ($campus && !in_array($campus, ALLOWED_CAMPUSES, true))   respond(['error' => 'Unknown campus'], 400);
    if ($id === (int) $admin['id'] && ($role !== 'admin' || !$active)) {
        respond(['error' => 'You cannot demote or deactivate your own account'], 400);
    }

    try {
        $pdo->prepare('UPDATE users SET full_name=?, email=?, role=?, mobile_number=?, campus=?, academic_level=?, program_year=?,
                              is_active=?, is_flagged=? WHERE id=?')
            ->execute([$name, $email, $role, $mobile, $campus, $level, $prog, $active, $flag, $id]);
    } catch (PDOException $e) {
        respond(['error' => 'Email already in use'], 409);
    }
    if (!empty($b['password'])) {
        if (strlen((string) $b['password']) < 8) respond(['error' => 'Password must be at least 8 characters'], 400);
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $b['password'], PASSWORD_DEFAULT), $id]);
    }

    $what = [];
    if ((int) $t['is_active'] !== $active) $what[] = $active ? 'activated' : 'deactivated';
    if ($t['role'] !== $role)              $what[] = "role -> $role";
    if (!empty($b['password']))            $what[] = 'password reset';
    if ((int) $t['is_flagged'] && !$flag)  $what[] = 'flag cleared';
    $act = 'Updated User';
    if ((int) $t['is_active'] !== $active) $act = $active ? 'Activated User' : 'Deactivated User';
    log_audit($admin, $act, 'User', $t['id_number'], $what ? implode(', ', $what) : 'Details edited', ['type' => 'User', 'student' => $name]);
    if ((int) $t['is_active'] !== $active) {
        notify($id, $active ? 'Your account was activated. You can now log in.' : 'Your account was deactivated. Please contact the SAO Office.', $active ? 'info' : 'alert');
    }
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
