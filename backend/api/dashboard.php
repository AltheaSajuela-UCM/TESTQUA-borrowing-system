$user = require_login();
<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';
$user = require_login();

$role = $_GET['role'] ?? 'student';
$response = [];

switch ($role) {
    case 'admin':
        $response = [
            "module" => "Admin Dashboard",
            "role" => "admin",
            "total_users" => 50,
            "system_status" => "Active",
            "pending_requests" => 4
        ];
        break;

    case 'working_scholar':
        $response = [
            "module" => "Working Scholar Dashboard",
            "role" => "working_scholar",
            "pending_counter" => 3,
            "tasks_assigned" => 8
        ];
        break;

    case 'student':
    default:
        $response = [
            "module" => "Student Dashboard",
            "role" => "student",
            "my_active_loans" => 1,
            "history_count" => 5
        ];
        break;
}

echo json_encode($response);
?>