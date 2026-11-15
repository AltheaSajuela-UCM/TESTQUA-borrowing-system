<?php
require_once __DIR__ . '/../helpers.php';
require_role('working_scholar');
require_method('GET');

// Working Scholar History: system activity log (borrow requests, cancellations, returns, item updates).
// GET ?type=Borrow Request|Cancellation Request|Item Update|Return  &date=2026-09-23  &q=maria  [&format=csv]
$result = [
    'Released Item' => 'Accepted', 'Accepted Cancellation' => 'Accepted', 'Rejected Request' => 'Rejected',
    'Declined Cancellation' => 'Declined', 'Updated Availability' => 'Availability updated',
    'Returned Item' => 'Returned', 'Submitted Request' => 'Submitted', 'Requested Cancellation' => 'Requested',
];
$rows = query_audit(
    ['type' => $_GET['type'] ?? '', 'date' => $_GET['date'] ?? '', 'q' => $_GET['q'] ?? '', 'limit' => $_GET['limit'] ?? 500],
    true,
    ['Borrow Request', 'Cancellation Request', 'Item Update', 'Return']
);
$out = array_map(fn($r) => [
    'date_time' => $r['timestamp'],
    'type'      => $r['event_type'],
    'student'   => $r['student_name'] ?: '-',
    'item'      => $r['item_name'] ?: '-',
    'action'    => $result[$r['action']] ?? $r['action'],
], $rows);

if ($fmt = wants_export()) {
    output_table($fmt, 'ws_history', 'Working Scholar History', ['Date & Time', 'Type', 'Student', 'Item', 'Action'],
        array_map(fn($r) => array_values($r), $out));
}
respond(['history' => $out]);
