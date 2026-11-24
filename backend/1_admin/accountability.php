<?php
// Accountability: lost / damaged / overdue cases. Cases are opened automatically when a Working Scholar records a
// Damaged/Lost return (open_case() in helpers.php) and the student is flagged until every case is resolved.
// GET  ?status=Open|Resolved|all (default Open)  &type=Lost|Damaged|Overdue  &q=  [&format=csv|pdf]
// POST {action:'resolve', case_id, replacement_received?: bool, notes?}
//      {action:'remind',  case_id}                                  notify the student
//      {action:'open_overdue', transaction_id, notes?}              open an Overdue case for an overdue active borrowing
require_once __DIR__ . '/../helpers.php';
$admin = require_role('admin');
$pdo   = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = 'SELECT c.id, c.transaction_id, c.type, c.status, c.notes, c.replacement_received, c.created_at, c.resolved_at,
                   u.full_name AS student, u.id_number AS student_id, u.mobile_number,
                   i.name AS item, i.item_code, rb.full_name AS resolved_by_name
            FROM accountability_cases c
            JOIN users u ON u.id = c.user_id JOIN inventories i ON i.id = c.inventory_id
            LEFT JOIN users rb ON rb.id = c.resolved_by WHERE 1=1';
    $p = [];
    $status = $_GET['status'] ?? 'Open';
    if ($status !== 'all') { $sql .= ' AND c.status = ?'; $p[] = $status; }
    if (!empty($_GET['type'])) { $sql .= ' AND c.type = ?'; $p[] = $_GET['type']; }
    if (!empty($_GET['q'])) {
        $sql .= ' AND (u.full_name LIKE ? OR u.id_number LIKE ? OR i.name LIKE ? OR i.item_code LIKE ?)';
        $l = '%' . $_GET['q'] . '%';
        array_push($p, $l, $l, $l, $l);
    }
    $stmt = $pdo->prepare($sql . ' ORDER BY c.status, c.created_at DESC');
    $stmt->execute($p);
    $rows = array_map(function ($r) {
        $r['case_code'] = case_code((int) $r['id']);
        $r['transaction_code'] = $r['transaction_id'] ? tx_code((int) $r['transaction_id']) : null;
        return $r;
    }, $stmt->fetchAll());

    if ($fmt = wants_export()) {
        output_table($fmt, 'accountability_cases', 'Accountability Cases', ['Case', 'Student', 'Item', 'Type', 'Status', 'Opened', 'Replacement'],
            array_map(fn($r) => [$r['case_code'], $r['student'], $r['item'], $r['type'], $r['status'], $r['created_at'], $r['replacement_received'] ? 'Yes' : 'No'], $rows));
    }
    $open = (int) $pdo->query("SELECT COUNT(*) FROM accountability_cases WHERE status = 'Open'")->fetchColumn();
    respond(['cases' => $rows, 'open_count' => $open]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Method not allowed'], 405);

$b = json_body();
$action = (string) ($b['action'] ?? '');

if ($action === 'open_overdue') {
    $s = $pdo->prepare("SELECT * FROM transactions WHERE id = ? AND status = 'active' AND expected_return_date < NOW()");
    $s->execute([(int) ($b['transaction_id'] ?? 0)]);
    $tx = $s->fetch();
    if (!$tx) respond(['error' => 'Only overdue active borrowings can be escalated'], 400);
    $id = open_case($pdo, $tx, 'Overdue', trim((string) ($b['notes'] ?? '')), $admin);
    respond(['success' => true, 'case_code' => case_code($id)], 201);
}

$s = $pdo->prepare('SELECT c.*, u.full_name AS student, i.name AS item FROM accountability_cases c
                    JOIN users u ON u.id = c.user_id JOIN inventories i ON i.id = c.inventory_id WHERE c.id = ?');
$s->execute([(int) ($b['case_id'] ?? 0)]);
$case = $s->fetch();
if (!$case) respond(['error' => 'Case not found'], 404);
$code = case_code((int) $case['id']);
$meta = ['type' => 'Accountability', 'student' => $case['student'], 'item' => $case['item']];

if ($action === 'remind') {
    if ($case['status'] !== 'Open') respond(['error' => 'Case is already resolved'], 400);
    notify((int) $case['user_id'], "Reminder: accountability case $code ({$case['type']} {$case['item']}) is still open. Please see the SAO Office.", 'alert', $case['transaction_id'] ? (int) $case['transaction_id'] : null);
    log_audit($admin, 'Sent Case Reminder', 'Accountability', $code, "Reminded {$case['student']}", $meta);
    respond(['success' => true]);
}

if ($action === 'resolve') {
    if ($case['status'] !== 'Open') respond(['error' => 'Case is already resolved'], 400);
    $replacement = !empty($b['replacement_received']) ? 1 : 0;
    $notes = trim((string) ($b['notes'] ?? ''));
    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE accountability_cases SET status = 'Resolved', replacement_received = ?, resolved_by = ?, resolved_at = NOW(),
                              notes = CONCAT_WS(' | ', NULLIF(notes, ''), NULLIF(?, '')) WHERE id = ?")
            ->execute([$replacement, $admin['id'], $notes, $case['id']]);
        if ($replacement && $case['type'] === 'Lost') {          // a replacement for a lost item goes back into stock
            $lu = $pdo->prepare("SELECT un.id FROM transactions t JOIN item_units un ON un.id = t.unit_id WHERE t.id = ? AND un.status = 'lost'");
            $lu->execute([$case['transaction_id']]);
            if ($lostUnit = $lu->fetchColumn()) {
                set_unit_status($pdo, (int) $lostUnit, 'available', 'Good');
                sync_stock($pdo, (int) $case['inventory_id']);
            } else {
                $pdo->prepare('UPDATE inventories SET stock = stock + 1 WHERE id = ?')->execute([$case['inventory_id']]);
                sync_availability($pdo, (int) $case['inventory_id']);
            }
        }
        $left = $pdo->prepare("SELECT COUNT(*) FROM accountability_cases WHERE user_id = ? AND status = 'Open'");
        $left->execute([$case['user_id']]);
        if ((int) $left->fetchColumn() === 0) {                   // no open cases left -> student may borrow again
            $pdo->prepare('UPDATE users SET is_flagged = 0 WHERE id = ?')->execute([$case['user_id']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['error' => 'Server error'], 500);
    }
    log_audit($admin, 'Resolved Case', 'Accountability', $code, "{$case['type']} {$case['item']} resolved" . ($replacement ? ' (replacement received)' : ''), $meta);
    notify((int) $case['user_id'], "Accountability case $code was resolved. Thank you.", 'info');
    respond(['success' => true]);
}

respond(['error' => "action must be 'resolve', 'remind' or 'open_overdue'"], 400);
