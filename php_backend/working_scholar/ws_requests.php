<?php
// Include database connection
include_once __DIR__ . '/../db_connect.php';

try {
    // Fetch all pending borrow requests
    $stmt = $conn->query("SELECT id, student_name, item_name, status, request_date FROM borrow_requests WHERE status = 'pending' ORDER BY request_date DESC");
    $all_pending_requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch cancellation requests (if you have a cancellation table or status)
    $stmt_cancel = $conn->query("SELECT id, student_name, item_name, status, request_date FROM borrow_requests WHERE status = 'cancellation_requested' ORDER BY request_date DESC");
    $all_cancellations = $stmt_cancel->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    $error_message = "Database Error: " . $e.getMessage();
    $all_pending_requests = [];
    $all_cancellations = [];
}
?>
