<?php
require_once __DIR__ . '/../helpers.php';
require_role('working_scholar', 'admin');
require_method('GET');

// Real-time monitoring: the page polls this every few seconds (e.g. setInterval 5000 ms).
// GET ?since=2026-09-21T09:00:00   -> only events newer than that timestamp (omit for the latest 10)
$pdo = db();
generate_due_alerts($pdo);

$n = fn(string $sql) => (int) $pdo->query($sql)->fetchColumn();
$summary = [
    'pending_requests'      => $n("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
    'cancellation_requests' => $n("SELECT COUNT(*) FROM cancellation_requests WHERE status = 'pending'"),
    'borrowed_items'        => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active'"),
    'overdue'               => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date < NOW()"),
    'due_soon'              => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date >= NOW()
                                   AND expected_return_date < DATE_ADD(NOW(), INTERVAL " . DUE_SOON_HOURS . " HOUR)"),
    'available_items'       => $n("SELECT COUNT(*) FROM inventories WHERE is_available = 1 AND availability_status = 'Available' AND stock > 0"),
];

$sql = "SELECT a.id, a.created_at AS timestamp, a.action, a.event_type, a.student_name, a.item_name, a.details
        FROM audit_logs a WHERE a.event_type <> 'Auth'";
$p = [];
if (!empty($_GET['since']) && ($t = strtotime((string) $_GET['since']))) { $sql .= ' AND a.created_at > ?'; $p[] = date('Y-m-d H:i:s', $t); }
$stmt = $pdo->prepare($sql . ' ORDER BY a.created_at DESC, a.id DESC LIMIT 10');
$stmt->execute($p);

respond(['summary' => $summary, 'events' => $stmt->fetchAll(), 'server_time' => date('Y-m-d H:i:s')]);
