<?php
// Generate Reports + Export Reports + Organization Leaderboard.
// GET ?type=inventory|borrowing|returns|overdue|damaged_lost|leaderboard  [&from=YYYY-MM-DD&to=YYYY-MM-DD]  [&format=csv|pdf]
// -> {type, title, headers:[...], rows:[[...]], total, generated_at}
//
// ASSUMPTION: the database has no "organization" column, so the leaderboard groups students by their
// program_year (e.g. "BSIT 3"). Change $orgExpr below if you add an organization column later.
require_once __DIR__ . '/../helpers.php';
require_role('admin');
require_method('GET');
$pdo  = db();
$type = (string) ($_GET['type'] ?? 'inventory');

// optional date range on a given column
$range = function (string $col, array &$p): string {
    $sql = '';
    if (!empty($_GET['from']) && strtotime((string) $_GET['from'])) { $sql .= " AND DATE($col) >= ?"; $p[] = date('Y-m-d', strtotime((string) $_GET['from'])); }
    if (!empty($_GET['to'])   && strtotime((string) $_GET['to']))   { $sql .= " AND DATE($col) <= ?"; $p[] = date('Y-m-d', strtotime((string) $_GET['to'])); }
    return $sql;
};
$run = function (string $sql, array $p = []) use ($pdo): array {
    $s = $pdo->prepare($sql);
    $s->execute($p);
    return $s->fetchAll();
};

$p = [];
switch ($type) {
    case 'inventory':
        $title = 'Inventory Report';
        $headers = ['Item Code', 'Item', 'Category', 'Stock', 'Currently Borrowed', 'Condition', 'Availability'];
        $rows = array_map(fn($r) => [$r['item_code'], $r['name'], $r['category'], $r['stock'], $r['borrowed'], $r['item_condition'], $r['availability_status']],
            $run("SELECT i.item_code, i.name, i.category, i.stock, i.item_condition, i.availability_status,
                         (SELECT COUNT(*) FROM transactions t WHERE t.inventory_id = i.id AND t.status = 'active') AS borrowed
                  FROM inventories i ORDER BY i.category, i.name"));
        break;

    case 'borrowing':
        $title = 'Borrowing Report';
        $headers = ['Transaction', 'Student', 'Item', 'Category', 'Requested', 'Due', 'Status'];
        $sql = "SELECT t.id, t.status, t.requested_at, t.expected_return_date, t.return_condition, u.full_name AS student,
                       i.name AS item, i.category, (t.status = 'active' AND t.expected_return_date < NOW()) AS is_overdue
                FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
                WHERE 1=1" . $range('t.requested_at', $p) . ' ORDER BY t.requested_at DESC';
        $rows = array_map(fn($r) => [tx_code((int) $r['id']), $r['student'], $r['item'], $r['category'], $r['requested_at'],
                                     $r['expected_return_date'] ?: '-', tx_display_status($r)], $run($sql, $p));
        break;

    case 'returns':
        $title = 'Returns Report';
        $headers = ['Transaction', 'Student', 'Item', 'Due', 'Returned', 'Condition', 'Received By'];
        $sql = "SELECT t.id, t.expected_return_date, t.returned_at, t.return_condition, u.full_name AS student, i.name AS item, rb.full_name AS received_by
                FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
                LEFT JOIN users rb ON rb.id = t.received_by
                WHERE t.status = 'returned'" . $range('t.returned_at', $p) . ' ORDER BY t.returned_at DESC';
        $rows = array_map(fn($r) => [tx_code((int) $r['id']), $r['student'], $r['item'], $r['expected_return_date'] ?: '-',
                                     $r['returned_at'], $r['return_condition'] ?: 'Good', $r['received_by'] ?: '-'], $run($sql, $p));
        break;

    case 'overdue':
        $title = 'Overdue Report';
        $headers = ['Transaction', 'Student', 'Mobile', 'Item', 'Due', 'Days Overdue'];
        $sql = "SELECT t.id, t.expected_return_date, u.full_name AS student, u.mobile_number, i.name AS item,
                       DATEDIFF(NOW(), t.expected_return_date) AS days
                FROM transactions t JOIN users u ON u.id = t.user_id JOIN inventories i ON i.id = t.inventory_id
                WHERE t.status = 'active' AND t.expected_return_date < NOW()" . $range('t.expected_return_date', $p) . ' ORDER BY t.expected_return_date';
        $rows = array_map(fn($r) => [tx_code((int) $r['id']), $r['student'], $r['mobile_number'] ?: '-', $r['item'],
                                     $r['expected_return_date'], $r['days']], $run($sql, $p));
        break;

    case 'damaged_lost':
        $title = 'Damaged / Lost Items Report';
        $headers = ['Case', 'Student', 'Item', 'Type', 'Status', 'Opened', 'Replacement'];
        $sql = "SELECT c.id, c.type, c.status, c.created_at, c.replacement_received, u.full_name AS student, i.name AS item
                FROM accountability_cases c JOIN users u ON u.id = c.user_id JOIN inventories i ON i.id = c.inventory_id
                WHERE c.type IN ('Damaged','Lost')" . $range('c.created_at', $p) . ' ORDER BY c.created_at DESC';
        $rows = array_map(fn($r) => [case_code((int) $r['id']), $r['student'], $r['item'], $r['type'], $r['status'],
                                     $r['created_at'], $r['replacement_received'] ? 'Yes' : 'No'], $run($sql, $p));
        break;

    case 'leaderboard':
        $title = 'Organization Leaderboard';
        $orgExpr = "COALESCE(NULLIF(u.program_year, ''), 'Unspecified')";
        $headers = ['Rank', 'Organization / Program', 'Borrowings', 'Returned On Time', 'On-Time Rate', 'Overdue / Late'];
        $sql = "SELECT $orgExpr AS org, COUNT(*) AS borrowings,
                       SUM(t.status = 'returned' AND t.returned_at <= t.expected_return_date) AS on_time,
                       SUM((t.status = 'returned' AND t.returned_at > t.expected_return_date)
                           OR (t.status = 'active' AND t.expected_return_date < NOW())) AS late
                FROM transactions t JOIN users u ON u.id = t.user_id
                WHERE t.status IN ('active','returned')" . $range('t.processed_at', $p) . "
                GROUP BY org ORDER BY on_time DESC, borrowings DESC, org";
        $rows = [];
        foreach ($run($sql, $p) as $k => $r) {
            $rate = $r['borrowings'] ? round($r['on_time'] * 100 / $r['borrowings']) . '%' : '0%';
            $rows[] = [$k + 1, $r['org'], (int) $r['borrowings'], (int) $r['on_time'], $rate, (int) $r['late']];
        }
        break;

    default:
        respond(['error' => 'type must be inventory, borrowing, returns, overdue, damaged_lost or leaderboard'], 400);
}

if ($fmt = wants_export()) {
    output_table($fmt, $type . '_report', $title, $headers, $rows);
}
respond(['type' => $type, 'title' => $title, 'headers' => $headers, 'rows' => $rows,
         'total' => count($rows), 'generated_at' => date('Y-m-d H:i:s')]);
