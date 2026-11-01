<?php
// Include database connection
include_once __DIR__ . '/../db_connect.php';

try {
    // Fetch notifications for the working scholar portal
    // Assuming you have a 'notifications' table with columns: id, message, type (normal/alert), is_read, created_at
    $stmt = $conn->query("SELECT id, message, type, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 10");
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Filter unread count for badges
    $unread_notifications = array_filter($notifications, function($n) {
        return $n['is_read'] == 0;
    });
    $unread_count = count($unread_notifications);

} catch (PDOException $e) {
    // Fallback empty arrays if the table isn't set up yet
    $notifications = [];
    $unread_count = 0;
}
?>