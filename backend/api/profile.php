<?php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../helpers.php';   // ALLOWED_CAMPUSES / ALLOWED_ACADEMIC_LEVELS
$user = require_login();

$labels = [
    'admin' => ['Admin Portal', 'Administrator'],
    'working_scholar' => ['Working Scholar Portal', 'Working Scholar'],
    'student' => ['Student Portal', 'Student'],
];

function profile_payload(array $user, array $labels): array {
    return [
        'account_type' => $labels[$user['role']][0],
        'full_name' => $user['full_name'],
        'identifier_id' => $user['id_number'],
        'role' => $user['role'],
        'role_title' => $labels[$user['role']][1],
        'email' => $user['email'] ?? null,
        'mobile_number' => $user['mobile_number'],
        'program_year' => $user['program_year'],
        'academic_level' => $user['academic_level'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(profile_payload($user, $labels));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_body();

    $fullName = trim((string) ($body['full_name'] ?? $user['full_name']));
    $idNumber = trim((string) ($body['identifier_id'] ?? $user['id_number']));
    $mobile = trim((string) ($body['mobile_number'] ?? $user['mobile_number'] ?? ''));
    $programYear = trim((string) ($body['program_year'] ?? $user['program_year'] ?? ''));
    $academicLevel = trim((string) ($body['academic_level'] ?? $user['academic_level'] ?? ''));
    $email = trim((string) ($body['email'] ?? $user['email'] ?? ''));
    $campus = trim((string) ($body['campus'] ?? $user['campus'] ?? ''));

    if ($fullName === '' || $idNumber === '') {
        respond(['error' => 'Full name and ID number are required.'], 400);
    }

    // Only validate what was actually changed, so older records still save.
    if ($idNumber !== $user['id_number'] && !preg_match('/^\d{8}$/', $idNumber)) {
        respond(['error' => 'ID number must be exactly 8 digits.'], 400);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Invalid email address.'], 400);
    }
    if ($campus !== '' && $campus !== (string) ($user['campus'] ?? '') && !in_array($campus, ALLOWED_CAMPUSES, true)) {
        respond(['error' => 'Unknown campus.'], 400);
    }
    if ($academicLevel !== '' && $academicLevel !== (string) ($user['academic_level'] ?? '')
        && !in_array($academicLevel, ALLOWED_ACADEMIC_LEVELS, true)) {
        respond(['error' => 'Unknown academic level.'], 400);
    }

    if ($mobile !== '' && !preg_match('/^[0-9+\-\s]{7,20}$/', $mobile)) {
        respond(['error' => 'Invalid mobile number.'], 400);
    }

    // Check if the ID is already used by another account
    $check = db()->prepare(
        'SELECT id FROM users WHERE id_number = ? AND id != ?'
    );
    $check->execute([$idNumber, $user['id']]);

    if ($check->fetch()) {
        respond(['error' => 'This Working Scholar ID is already being used.'], 400);
    }

    if ($email !== '') {
        $emailCheck = db()->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?');
        $emailCheck->execute([$email, $user['id']]);
        if ($emailCheck->fetch()) {
            respond(['error' => 'This email address is already being used.'], 400);
        }
    }

    // Validate password change before saving profile information
    if (!empty($body['new_password'])) {
        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $hash = $stmt->fetchColumn();

        if (!password_verify((string) ($body['current_password'] ?? ''), $hash)) {
            respond(['error' => 'Current password is incorrect.'], 400);
        }

        if (strlen((string) $body['new_password']) < 8) {
            respond(['error' => 'New password must be at least 8 characters.'], 400);
        }
    }

    // Update profile information
    $update = db()->prepare(
        'UPDATE users
         SET full_name = ?,
             id_number = ?,
             email = ?,
             mobile_number = ?,
             campus = ?,
             program_year = ?,
             academic_level = ?
         WHERE id = ?'
    );

    $update->execute([
        $fullName,
        $idNumber,
        $email !== '' ? $email : null,
        $mobile !== '' ? $mobile : null,
        $campus !== '' ? $campus : null,
        $programYear !== '' ? $programYear : null,
        $academicLevel !== '' ? $academicLevel : null,
        $user['id']
    ]);

    // Update password if a new password was provided
    if (!empty($body['new_password'])) {
        db()->prepare(
            'UPDATE users SET password_hash = ? WHERE id = ?'
        )->execute([
            password_hash((string) $body['new_password'], PASSWORD_DEFAULT),
            $user['id']
        ]);
    }

    respond([
        'success' => true,
        'profile' => profile_payload(current_user(), $labels)
    ]);
}

respond(['error' => 'Method not allowed'], 405);
