<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php';

$role = $_GET['role'] ?? 'student';
$response = [];

if ($role === 'admin') {
    $response = [
        "account_type" => "Admin Portal",
        "full_name" => "System Administrator",
        "identifier_id" => "00000001",
        "role_title" => "Administrator",
        "mobile_number" => "09123456789"
    ];
} elseif ($role === 'working_scholar') {
    $response = [
        "account_type" => "Working Scholar Portal",
        "full_name" => "Juan Dela Cruz",
        "identifier_id" => "WS-2026-004",
        "role_title" => "Working Scholar",
        "mobile_number" => "09987654321"
    ];
} else {
    $response = [
        "account_type" => "Student Portal",
        "full_name" => "Maria Santos",
        "identifier_id" => "STU-2026-109",
        "role_title" => "Student",
        "mobile_number" => "09112233445"
    ];
}

echo json_encode($response);
?>