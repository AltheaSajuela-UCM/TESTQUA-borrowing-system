<?php
require_once __DIR__ . '/../auth.php';
require_method('POST');

$body     = json_body();
$idNumber = trim((string)($body['id_number'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($idNumber === '' || $password === '') {
    respond(['error' => 'ID number and password are required'], 400);
}

$stmt = db()->prepare('SELECT * FROM users WHERE id_number = ?');
$stmt->execute([$idNumber]);
$user = $stmt->fetch();

// Same message for unknown ID and wrong password, so IDs can't be guessed.
if (!$user || !password_verify($password, $user['password_hash'])) {
    respond(['error' => 'Invalid ID number or password'], 401);
}

if (isset($user['is_active']) && !$user['is_active']) {
    respond(['error' => 'Account is disabled'], 403);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];

respond([
    'success' => true,
    'user' => [
        'id_number' => $user['id_number'],
        'full_name' => $user['full_name'],
        'role'      => $user['role'],
    ],
]);