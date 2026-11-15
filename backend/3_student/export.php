<?php
// The student's own borrowing history as a CSV or PDF download.
// GET ?format=csv|pdf  [&status=Completed|Returned|Rejected|Cancelled]  [&q=search text]
// Needs backend/helpers.php and backend/pdf.php (from the team's main branch).
require_once __DIR__ . '/../helpers.php';   // output_table(), tx_code(), tx_display_status()
$user = require_role('student');
require_method('GET');

$format = wants_export();
if ($format === null) {
    respond(['error' => 'Use ?format=csv or ?format=pdf'], 400);
}

$stmt = db()->prepare(
    "SELECT t.id, t.status, t.requested_at, t.processed_at, t.returned_at, t.return_condition,
            i.name AS item_name, i.category
     FROM transactions t
     JOIN inventories i ON i.id = t.inventory_id
     WHERE t.user_id = ? AND t.status IN ('returned', 'rejected', 'cancelled')
     ORDER BY t.requested_at DESC"
);
$stmt->execute([$user['id']]);

$wantStatus = trim((string) ($_GET['status'] ?? ''));
$needle     = strtolower(trim((string) ($_GET['q'] ?? '')));

$rows = [];
foreach ($stmt->fetchAll() as $t) {
    $label    = tx_display_status($t);   // same labels as the History page
    $borrowed = substr((string) ($t['status'] === 'returned' ? ($t['processed_at'] ?: $t['requested_at']) : $t['requested_at']), 0, 10);
    $returned = $t['returned_at'] ? substr($t['returned_at'], 0, 10) : '-';
    $row = [tx_code((int) $t['id']), $t['item_name'], $t['category'], $borrowed, $returned, $label];

    if ($wantStatus !== '' && $wantStatus !== 'All' && $label !== $wantStatus) {
        continue;
    }
    if ($needle !== '' && strpos(strtolower(implode(' ', $row)), $needle) === false) {
        continue;
    }
    $rows[] = $row;
}

output_table(
    $format,
    'my_borrowing_history',
    'Borrow History - ' . $user['id_number'],
    ['Transaction ID', 'Item', 'Category', 'Date Borrowed', 'Date Returned', 'Status'],
    $rows
);
