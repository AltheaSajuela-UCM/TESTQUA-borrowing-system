<?php
// Admin History: every business event (requests, cancellations, returns, item/user/category changes, cases).
// Login/logout noise is excluded - that lives in the Audit Trail.
// GET ?type=Borrow Request|Cancellation Request|Item Update|Return|User|Category|Accountability
//     &date=YYYY-MM-DD | &from=&to=   &q=search   &action=Released&limit=500   [&format=csv|pdf]
require_once __DIR__ . '/../helpers.php';
require_role('admin');
require_method('GET');

$rows = query_audit([
    'type' => $_GET['type'] ?? '', 'date' => $_GET['date'] ?? '', 'from' => $_GET['from'] ?? '', 'to' => $_GET['to'] ?? '',
    'q' => $_GET['q'] ?? '', 'action' => $_GET['action'] ?? '', 'limit' => $_GET['limit'] ?? 500,
], true);

$out = array_map(fn($r) => [
    'date_time' => $r['timestamp'], 'type' => $r['event_type'], 'student' => $r['student_name'] ?: '-',
    'item' => $r['item_name'] ?: '-', 'action' => $r['action'], 'by' => $r['user'] . ' (' . ($r['role'] ?: 'system') . ')',
    'reference' => $r['entity_id'] ?: '-', 'details' => $r['details'] ?: '',
], $rows);

if ($fmt = wants_export()) {
    output_table($fmt, 'admin_history', 'Admin History', ['Date & Time', 'Type', 'Student', 'Item', 'Action', 'By', 'Ref'],
        array_map(fn($r) => [$r['date_time'], $r['type'], $r['student'], $r['item'], $r['action'], $r['by'], $r['reference']], $out));
}
respond(['history' => $out]);
