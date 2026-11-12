<?php
// Password recovery for ALL roles (student, working scholar, admin).
// The user proves who they are with their ID number + the mobile number on file,
// then sets a new password.
//
// POST {id_number, mobile_number, new_password}
require_once __DIR__ . '/../auth.php';
require_method('POST');

$body     = json_body();
$idNumber = trim((string) ($body['id_number'] ?? ''));
$mobile   = (string) ($body['mobile_number'] ?? '');
$newPass  = (string) ($body['new_password'] ?? '');

if ($idNumber === '' || trim($mobile) === '' || $newPass === '') {
    respond(['error' => 'ID number, mobile number and new password are required'], 400);
}
if (strlen($newPass) < 8) {
    respond(['error' => 'New password must be at least 8 characters'], 400);
}

// Basic brute-force limit: 5 attempts per browser session.
$_SESSION['recovery_attempts'] = ($_SESSION['recovery_attempts'] ?? 0) + 1;
if ($_SESSION['recovery_attempts'] > 5) {
    respond(['error' => 'Too many attempts. Please try again later or contact an administrator.'], 429);
}

// Compare only the digits, and only the last 10 (so 09171234567 matches +639171234567).
function last10(string $s): string
{
    return substr(preg_replace('/\D/', '', $s), -10);
}

$stmt = db()->prepare('SELECT id, mobile_number, is_active FROM users WHERE id_number = ?');
$stmt->execute([$idNumber]);
$user = $stmt->fetch();

// One generic message for "no such ID", "no mobile on file" and "wrong mobile",
// so the endpoint can't be used to find out which IDs exist.
$generic = 'ID number and mobile number do not match our records';

if (!$user || empty($user['mobile_number']) || last10($mobile) === ''
    || last10($mobile) !== last10($user['mobile_number'])) {
    respond(['error' => $generic], 400);
}
if (isset($user['is_active']) && !$user['is_active']) {
    respond(['error' => 'Account is disabled. Please contact an administrator.'], 403);
}

db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    ->execute([password_hash($newPass, PASSWORD_DEFAULT), $user['id']]);

$_SESSION['recovery_attempts'] = 0;
respond(['success' => true, 'message' => 'Password updated. You can now log in.']);