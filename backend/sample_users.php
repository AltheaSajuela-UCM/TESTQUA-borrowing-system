<?php
// Run ONCE from the command line (refuses to run in a browser):
//   C:\xampp\php\php.exe sample_users.php
// No command line (InfinityFree)? Run migrations/004_test_accounts.sql in phpMyAdmin instead - same 9 accounts.
// Re-running resets the passwords of these 9 accounts and re-activates them.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
require_once __DIR__ . '/db.php';

$users = [
    //   ID no.   full name         role         password
    ['StuT01', 'Student Tester 1', 'student', 'password'],
    ['StuT02', 'Student Tester 2', 'student', 'password'],
    ['StuT03', 'Student Tester 3', 'student', 'password'],
    ['SchT01', 'Working Scholar Tester 1', 'working_scholar', 'password'],
    ['SchT02', 'Working Scholar Tester 2', 'working_scholar', 'password'],
    ['SchT03', 'Working Scholar Tester 3', 'working_scholar', 'password'],
    ['AdT01', 'Admin Tester 1', 'admin', 'password'],
    ['AdT02', 'Admin Tester 2', 'admin', 'password'],
    ['AdT03', 'Admin Tester 3', 'admin', 'password'],
];

$stmt = db()->prepare(
    "INSERT INTO users (id_number, full_name, role, mobile_number, campus, academic_level, program_year, password_hash, is_active)
     VALUES (?, ?, ?, ?, 'UC-Main', ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), password_hash = VALUES(password_hash), is_active = 1"
);
$n = 0;
foreach ($users as [$id, $name, $role, $pw]) {
    $n++;
    $stmt->execute([$id, $name, $role, '0900000' . str_pad((string) $n, 4, '0', STR_PAD_LEFT),
                    $role === 'student' ? 'College' : null, $role === 'admin' ? null : 'BSIT 3',
                    password_hash($pw, PASSWORD_DEFAULT)]);
    echo "Seeded $id ($role)\n";
}
