<?php
// Real dashboard numbers for all three roles. The role comes from the SESSION (never from the URL).
//   student -> {stats, active_borrowings}      working_scholar -> {summary, pending, overdue_alerts}
//   admin   -> {stats, category_distribution, top_borrowed, trend}
require_once __DIR__ . '/../helpers.php';
$user = require_login();
$pdo  = db();
generate_due_alerts($pdo);   // lazy due/overdue alerts (there is no cron job)

$n = function (string $sql, array $p = []) use ($pdo): int {
    $s = $pdo->prepare($sql);
    $s->execute($p);
    return (int) $s->fetchColumn();
};
$dueSoon = "expected_return_date >= NOW() AND expected_return_date < DATE_ADD(NOW(), INTERVAL " . DUE_SOON_HOURS . " HOUR)";
$availableSql = "SELECT COUNT(*) FROM inventories WHERE is_available = 1 AND availability_status = 'Available' AND stock > 0";

if ($user['role'] === 'student') {
    $s = $pdo->prepare("SELECT t.id, t.expected_return_date, i.item_code, i.name AS item_name,
                               COALESCE(t.expected_return_date < NOW(), 0) AS is_overdue
                        FROM transactions t JOIN inventories i ON i.id = t.inventory_id
                        WHERE t.user_id = ? AND t.status = 'active' ORDER BY t.expected_return_date");
    $s->execute([$user['id']]);
    $active = $s->fetchAll();
    respond([
        'module' => 'Student Dashboard', 'role' => 'student',
        'user'   => ['full_name' => $user['full_name'], 'id_number' => $user['id_number']],
        'stats'  => [
            'active'    => count($active),
            'overdue'   => count(array_filter($active, fn($r) => (int) $r['is_overdue'] === 1)),
            'pending'   => $n("SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = 'pending'", [$user['id']]),
            'available' => $n($availableSql),
        ],
        'active_borrowings' => $active,
    ]);
}

if ($user['role'] === 'working_scholar') {
    $pending = $pdo->query("SELECT t.id, u.full_name AS student, u.id_number, i.name AS item, t.requested_at
                            FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
                            WHERE t.status = 'pending' ORDER BY t.requested_at LIMIT 8")->fetchAll();
    $over = $pdo->query("SELECT t.id, u.full_name AS student, i.name AS item, t.expected_return_date,
                                DATEDIFF(NOW(), t.expected_return_date) AS days_overdue
                         FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
                         WHERE t.status = 'active' AND t.expected_return_date < NOW()
                         ORDER BY t.expected_return_date LIMIT 8")->fetchAll();
    respond([
        'module' => 'Working Scholar Dashboard', 'role' => 'working_scholar',
        'user'   => ['full_name' => $user['full_name']],
        'summary' => [
            'pending_requests'      => $n("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
            'cancellation_requests' => $n("SELECT COUNT(*) FROM cancellation_requests WHERE status = 'pending'"),
            'borrowed_items'        => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active'"),
            'overdue'               => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date < NOW()"),
            'due_soon'              => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active' AND $dueSoon"),
            'available_items'       => $n($availableSql),
        ],
        'pending'        => array_map(fn($r) => $r + ['transaction_code' => tx_code((int) $r['id'])], $pending),
        'overdue_alerts' => array_map(fn($r) => $r + ['transaction_code' => tx_code((int) $r['id'])], $over),
    ]);
}

// ---- admin
$cats = $pdo->query("SELECT i.category AS name, COUNT(*) AS borrows
                     FROM transactions t JOIN inventories i ON i.id = t.inventory_id
                     WHERE t.status IN ('active','returned') GROUP BY i.category")->fetchAll();
$totalBorrows = array_sum(array_column($cats, 'borrows'));
$dist = array_map(fn($c) => [
    'name' => $c['name'], 'borrows' => (int) $c['borrows'],
    'percent' => $totalBorrows ? (int) round($c['borrows'] * 100 / $totalBorrows) : 0,
], $cats);
foreach (['Academic', 'Non-Academic'] as $must) {      // always show the two core categories
    if (!in_array($must, array_column($dist, 'name'), true)) $dist[] = ['name' => $must, 'borrows' => 0, 'percent' => 0];
}

$top = $pdo->query("SELECT i.name, COUNT(*) AS borrows FROM transactions t JOIN inventories i ON i.id = t.inventory_id
                    WHERE t.status IN ('active','returned') GROUP BY i.id, i.name ORDER BY borrows DESC, i.name LIMIT 3")->fetchAll();

$trend = [];
for ($k = 5; $k >= 0; $k--) {
    $m = new DateTime('first day of this month');
    $m->modify("-$k month");
    $trend[$m->format('Y-m')] = ['month' => $m->format('M'), 'count' => 0];
}
$rows = $pdo->query("SELECT DATE_FORMAT(requested_at, '%Y-%m') AS ym, COUNT(*) AS c FROM transactions
                     WHERE status NOT IN ('rejected','cancelled')
                       AND requested_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 5 MONTH)
                     GROUP BY ym")->fetchAll();
foreach ($rows as $r) {
    if (isset($trend[$r['ym']])) $trend[$r['ym']]['count'] = (int) $r['c'];
}

respond([
    'module' => 'Admin Dashboard', 'role' => 'admin',
    'user'   => ['full_name' => $user['full_name']],
    'stats'  => [
        'total_users'          => $n('SELECT COUNT(*) FROM users'),
        'total_items'          => $n('SELECT COUNT(*) FROM inventories'),
        'active_transactions'  => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active'"),
        'overdue'              => $n("SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date < NOW()"),
        'accountability_cases' => $n("SELECT COUNT(*) FROM accountability_cases WHERE status = 'Open'"),
        'pending_requests'     => $n("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
    ],
    'category_distribution' => $dist,
    'top_borrowed'          => array_map(fn($t) => ['name' => $t['name'], 'borrows' => (int) $t['borrows']], $top),
    'trend'                 => array_values($trend),
]);
