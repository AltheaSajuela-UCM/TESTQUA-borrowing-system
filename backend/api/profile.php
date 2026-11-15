<?php
require_once __DIR__ . '/../auth.php';
$user = require_login();

$labels = [
    'admin'           => ['Admin Portal', 'Administrator'],
    'working_scholar' => ['Working Scholar Portal', 'Working Scholar'],
    'student'         => ['Student Portal', 'Student'],
];

function profile_payload(array $user, array $labels): array
{
    return [
        'account_type'  => $labels[$user['role']][0],
        'full_name'     => $user['full_name'],
        'identifier_id' => $user['id_number'],
        'role'          => $user['role'],
        'role_title'    => $labels[$user['role']][1],
        'mobile_number' => $user['mobile_number'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(profile_payload($user, $labels));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_body();
    $mobile = array_key_exists('mobile_number', $body) ? trim((string) $body['mobile_number']) : null;

    if ($mobile !== null) {
        if ($mobile !== '' && !preg_match('/^[0-9+\-\s]{7,20}$/', $mobile)) {
            respond(['error' => 'Invalid mobile number'], 400);
        }
        db()->prepare('UPDATE users SET mobile_number = ? WHERE id = ?')
            ->execute([$mobile ?: null, $user['id']]);
    }

    // Password change needs the current password.
    if (!empty($body['new_password'])) {
        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $hash = $stmt->fetchColumn();

        if (!password_verify((string) ($body['current_password'] ?? ''), $hash)) {
            respond(['error' => 'Current password is incorrect'], 400);
        }
        if (strlen((string) $body['new_password']) < 8) {
            respond(['error' => 'New password must be at least 8 characters'], 400);
        }
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash((string) $body['new_password'], PASSWORD_DEFAULT), $user['id']]);
    }

    respond(['success' => true, 'profile' => profile_payload(current_user(), $labels)]);
}

respond(['error' => 'Method not allowed'], 405);