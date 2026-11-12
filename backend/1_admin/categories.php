<?php
require_once __DIR__ . '/../auth.php';
require_role('admin');

// inventories.category is an ENUM('Academic','Non-Academic'), so the categories are fixed.
// GET : both categories with item counts and total stock
require_method('GET');

$rows = db()->query(
    "SELECT c.name,
            COUNT(i.id) AS item_count,
            COALESCE(SUM(i.stock), 0) AS total_stock
     FROM (SELECT 'Academic' AS name UNION SELECT 'Non-Academic') c
     LEFT JOIN inventories i ON i.category = c.name
     GROUP BY c.name ORDER BY c.name"
)->fetchAll();

respond(['categories' => $rows]);