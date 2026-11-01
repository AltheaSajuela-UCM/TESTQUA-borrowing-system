<?php
// Include database connection
include_once __DIR__ . '/../db_connect.php';

try {
    // Fetch past processed requests for audit history
    $stmt = $conn->query("SELECT id, student_name, item_name, status, request_date FROM borrow_requests WHERE status != 'pending' ORDER BY request_date DESC LIMIT 50");
    $history_logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    $history_logs = [];
}
?>