<?php
// Include database connection
include_once __DIR__ . '/../db_connect.php';

try {
    // Fetch all inventory items (adjust table/column names to match your database schema if needed)
    $stmt = $conn->query("SELECT * FROM inventory ORDER BY item_name ASC");
    $inventory_items = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    $inventory_items = [];
}
?>