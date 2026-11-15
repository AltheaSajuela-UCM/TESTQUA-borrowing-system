<?php
// Student dashboard numbers + active borrowings. Student-only; everything is
// scoped to the logged-in student, nothing comes from the URL.
require_once __DIR__ . '/../auth.php';
$user = require_role('student');
require_method('GET');
$pdo = db();

$stmt = $pdo->prepare(
    "SELECT t.id, t.expected_return_date, t.processed_at,
            i.item_code, i.name AS item_name,
            COALESCE(t.expected_return_date < NOW(), 0) AS is_overdue
     FROM transactions t
     JOIN inventories i ON i.id = t.inventory_id
     WHERE t.user_id = ? AND t.status = 'active'
     ORDER BY t.expected_return_date ASC"
);
$stmt->execute([$user['id']]);
$active = $stmt->fetchAll();

$overdue = 0;
foreach ($active as $row) {
    if ((int) $row['is_overdue'] === 1) {
        $overdue++;
    }
}

// Same rule browse.php uses for "available".
$available = (int) $pdo->query(
    'SELECT COUNT(*) FROM inventories WHERE is_available = 1 AND stock > 0'
)->fetchColumn();

respond([
    'user'  => ['full_name' => $user['full_name'], 'id_number' => $user['id_number']],
    'stats' => [
        'active'    => count($active),
        'overdue'   => $overdue,
        'available' => $available,
    ],
    'active_borrowings' => $active,
]);
