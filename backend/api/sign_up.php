<?php
// Registration for all roles (modules: Student / Admin / Working Scholar Registration).
//   student          -> open to everyone
//   working_scholar  -> created, but inactive until an admin activates it (config 'ws_requires_activation', default true)
//   admin            -> only with the secret 'admin_access_code' set in backend/config.php (disabled when empty)
// POST {id_number, full_name | first_name/middle_name/last_name, mobile_number, password,
//       terms_accepted, role?, email?, campus?, academic_level?, program_year?, admin_access_code?}
require_once __DIR__ . '/../helpers.php';
require_method('POST');

$b    = json_body();
$role = (string) ($b['role'] ?? 'student');
if (!in_array($role, ['student', 'working_scholar', 'admin'], true)) {
    respond(['error' => 'Invalid role'], 400);
}

$idNumber = trim((string) ($b['id_number'] ?? $b['student_id'] ?? ''));
$full     = trim((string) ($b['full_name'] ?? ''));
if ($full === '') {
    $full = trim(preg_replace('/\s+/', ' ',
        ($b['first_name'] ?? '') . ' ' . ($b['middle_name'] ?? '') . ' ' . ($b['last_name'] ?? '')));
}
$mobile   = trim((string) ($b['mobile_number'] ?? $b['contact'] ?? ''));
$email    = trim((string) ($b['email'] ?? ''));
$password = (string) ($b['password'] ?? '');
$campus   = trim((string) ($b['campus'] ?? ''));
$level    = trim((string) ($b['academic_level'] ?? ''));
$program  = trim((string) ($b['program_year'] ?? ''));

if (!preg_match('/^\d{8}$/', $idNumber))                    respond(['error' => 'ID number must be exactly 8 digits'], 400);
if ($full === '')                                           respond(['error' => 'Full name is required'], 400);
if (!preg_match('/^[0-9+\-\s]{10,20}$/', $mobile))          respond(['error' => 'Enter a valid mobile number (e.g. 09000000000)'], 400);
if (strlen($password) < 8)                                  respond(['error' => 'Password must be at least 8 characters'], 400);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Invalid email address'], 400);
if (empty($b['terms_accepted']))                            respond(['error' => 'You must accept the Terms and Conditions'], 400);
if ($campus !== '' && !in_array($campus, ALLOWED_CAMPUSES, true))       respond(['error' => 'Unknown campus'], 400);
if ($level !== '' && !in_array($level, ALLOWED_ACADEMIC_LEVELS, true))  respond(['error' => 'Unknown academic level'], 400);

$active = 1;
if ($role === 'admin') {
    $code = (string) app_setting('admin_access_code', '');
    if ($code === '' || !hash_equals($code, (string) ($b['admin_access_code'] ?? ''))) {
        respond(['error' => 'Admin registration needs a valid access code'], 403);
    }
} elseif ($role === 'working_scholar') {
    $active = app_setting('ws_requires_activation', true) ? 0 : 1;
}

try {
    db()->prepare(
        'INSERT INTO users (id_number, full_name, email, role, mobile_number, campus, academic_level, program_year,
                            password_hash, is_active, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    )->execute([$idNumber, $full, $email !== '' ? $email : null, $role, $mobile,
                $campus !== '' ? $campus : null, $level !== '' ? $level : null, $program !== '' ? $program : null,
                password_hash($password, PASSWORD_DEFAULT), $active]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') respond(['error' => 'That ID number or email is already registered'], 409);
    respond(['error' => 'Server error'], 500);
}
$newId = (int) db()->lastInsertId();

log_audit(['id' => $newId, 'role' => $role], 'Registered', 'User', $idNumber, "New $role account ($full)", ['type' => 'User', 'student' => $full]);
if ($role === 'working_scholar' && !$active) {
    notify_role('admin', "New Working Scholar $full ($idNumber) is waiting for activation.", 'info');
}

respond([
    'success' => true,
    'user' => ['id_number' => $idNumber, 'full_name' => $full, 'role' => $role],
    'requires_activation' => !$active,
    'message' => $active ? 'Account registered successfully.' : 'Account registered. An administrator must activate it before you can log in.',
], 201);
