<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$role = $_GET['role'] ?? 'student';

if ($method === 'POST') {
    // Read JSON input or POST fields
    $data = json_decode(file_get_contents("php://input"), true);
    $item_id = $data['item_id'] ?? 'ITEM-001';
    $borrower = $data['borrower'] ?? 'User';

    // Return confirmation of the borrowing transaction
    echo json_encode([
        "success" => true,
        "message" => "Borrowing operation recorded successfully.",
        "role_action_by" => $role,
        "item_id" => $item_id,
        "status" => "Pending Approval"
    ]);
} else {
    // For GET requests, return a simple list of mock/database items to borrow
    echo json_encode([
        "module" => "Borrowing Operations",
        "role" => $role,
        "available_items" => [
            ["id" => 1, "name" => "Projector", "status" => "Available"],
            ["id" => 2, "name" => "Extension Cord", "status" => "Available"],
            ["id" => 3, "name" => "Laptop", "status" => "In Use"]
        ]
    ]);
}
?>