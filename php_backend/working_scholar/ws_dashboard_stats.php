<?php
// Use absolute directory path to reliably find db_connect.php in php_backend/
include_once __DIR__ . '/../db_connect.php';

// Initialize default variables for the dashboard
$pending_count = 0;
$borrowed_count = 0;
$overdue_count = 0;
$available_count = 0;
$pending_requests = [];
$overdue_alerts = [];

try {
    // 1. Fetch count for PENDING REQUESTS
    $stmt_pending = $conn->query("SELECT COUNT(*) FROM borrow_requests WHERE status = 'pending'");
    $pending_count = $stmt_pending->fetchColumn();

    // 2. Fetch count for CURRENTLY BORROWED ITEMS
    $stmt_borrowed = $conn->query("SELECT COUNT(*) FROM borrow_requests WHERE status = 'borrowed'");
    $borrowed_count = $stmt_borrowed->fetchColumn();

    // 3. Fetch count for OVERDUE ITEMS
    $stmt_overdue = $conn->query("SELECT COUNT(*) FROM borrow_requests WHERE status = 'overdue'");
    $overdue_count = $stmt_overdue->fetchColumn();

    // 4. Fetch count for AVAILABLE ITEMS in inventory
    $stmt_available = $conn->query("SELECT COUNT(*) FROM inventory WHERE status = 'available'");
    $available_count = $stmt_available->fetchColumn();

    // 5. Fetch recent pending requests for the "Pending Requests" preview table
   $stmt_table = $conn->query("SELECT id, student_name, item_name, status, request_date FROM borrow_requests WHERE status = 'pending' LIMIT 5");
    $pending_requests = $stmt_table->fetchAll(PDO::FETCH_ASSOC);

    // 6. Fetch active overdue alerts for the bottom section
    $stmt_alerts = $conn->query("SELECT student_name, item_name, due_date FROM borrow_requests WHERE status = 'overdue' LIMIT 5");
    $overdue_alerts = $stmt_alerts->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Handle database query errors gracefully
    $error_message = "Error fetching dashboard data: " . $e->getMessage();
}
?>