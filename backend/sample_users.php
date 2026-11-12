<?php
// Run ONCE from the command line (refuses to run in a browser):
//   C:\xampp\php\php.exe seed_users.php
// Names below are placeholders - edit them first if you like.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
require_once __DIR__ . '/db.php';

$users = [
    //   ID no.     full name               role               password
    ['90000001', 'System Administrator', 'admin',           'Admin123!'],
    ['80000001', 'Working Scholar 1',    'working_scholar', 'Scholar123!'],
    ['80000002', 'Working Scholar 2',    'working_scholar', 'Scholar123!'],
    ['20240001', 'Student 1',            'student',         'Student123!'],
    ['20240002', 'Student 2',            'student',         'Student123!'],
    ['20240003', 'Student 3',            'student',         'Student123!'],
];

$stmt = db()->prepare(
    'INSERT IGNORE INTO users (id_number, full_name, role, password_hash) VALUES (?, ?, ?, ?)'
);
foreach ($users as [$id, $name, $role, $pw]) {
    $stmt->execute([$id, $name, $role, password_hash($pw, PASSWORD_DEFAULT)]);
    echo "Seeded $id ($role)\n";
}