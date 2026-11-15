<?php
// Audit Trail: the complete log for accountability - who did what, when, including logins.
// GET ?type=Auth|Borrow Request|...  &action=Released  &date= | &from=&to=  &q=  &limit=500  [&format=csv|pdf]
// -> {audit:[...], summary:{<event type>: count}, total}
require_once __DIR__ . '/../helpers.php';
require_role('admin');
require_method('GET');

$rows = query_audit([
    'type' => $_GET['type'] ?? '', 'date' => $_GET['date'] ?? '', 'from' => $_GET['from'] ?? '', 'to' => $_GET['to'] ?? '',
    'q' => $_GET['q'] ?? '', 'action' => $_GET['action'] ?? '', 'limit' => $_GET['limit'] ?? 500,
], false);

if ($fmt = wants_export()) {
    output_table($fmt, 'audit_trail', 'Audit Trail', ['Date & Time', 'User', 'Role', 'Action', 'Type', 'Reference', 'Details'],
        array_map(fn($r) => [$r['timestamp'], $r['user'], $r['role'] ?: '-', $r['action'], $r['event_type'], $r['entity_id'] ?: '-', $r['details'] ?: ''], $rows));
}

$summary = [];
foreach ($rows as $r) $summary[$r['event_type']] = ($summary[$r['event_type']] ?? 0) + 1;
respond(['audit' => array_map(fn($r) => [
    'id' => (int) $r['id'], 'date_time' => $r['timestamp'], 'user' => $r['user'], 'role' => $r['role'],
    'action' => $r['action'], 'type' => $r['event_type'], 'entity' => $r['entity'], 'reference' => $r['entity_id'],
    'student' => $r['student_name'], 'item' => $r['item_name'], 'details' => $r['details'],
], $rows), 'summary' => $summary, 'total' => count($rows)]);
