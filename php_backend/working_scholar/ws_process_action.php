<?php
// Include database connection using absolute path
include_once __DIR__ . '/../db_connect.php';

if (isset($_GET['id']) && isset($_GET['action'])) {
    $id = intval($_GET['id']);
    $action = $_GET['action'];

    try {
        if ($action === 'approve') {
            // Update status to borrowed or approved based on your workflow
            $stmt = $conn->prepare("UPDATE borrow_requests SET status = 'borrowed' WHERE id = ?");
            $stmt->execute([$id]);
        } elseif ($action === 'reject') {
            // Update status to rejected
            $stmt = $conn->prepare("UPDATE borrow_requests SET status = 'rejected' WHERE id = ?");
            $stmt->execute([$id]);
        }
    } catch (PDOException $e) {
        // Handle error silently or log it
    }
}

// Redirect back to the dashboard after processing
header("Location: ../../html_files/working_scholar_page/working_scholar_dashboard.php");
exit();
?>