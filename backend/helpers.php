<?php
// Shared business helpers used by the endpoints (audit log, notifications,
// eligibility rules, office-hours rule, CSV/PDF export).
require_once __DIR__ . '/auth.php';

// ---------------------------------------------------------------- settings
// Optional keys can be added to backend/config.php (it is git-ignored):
//   'admin_access_code'        => 'SAO-ADMIN-2026',  // required to self-register an admin; empty = disabled
//   'ws_requires_activation'   => true,              // new working scholars stay inactive until an admin activates them
//   'recovery_dev_mode'        => true,              // returns the 6-digit code in the API response (no SMS/email gateway yet)
//   'ws_can_edit_status'       => true,              // default on; set false to make the WS inventory view read-only
function app_setting(string $key, $default = null)
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        $cfg = is_file($file) ? include $file : [];
        if (!is_array($cfg)) $cfg = [];
    }
    return $cfg[$key] ?? $default;
}

const ALLOWED_CAMPUSES        = ['UC-Main', 'UC-Pri', 'UC-Banilad', 'UC-LM', 'UC-PT'];
const ALLOWED_ACADEMIC_LEVELS = ['Senior High', 'College', 'Graduate School'];
const AVAILABILITY_STATUSES   = ['Available', 'Borrowed', 'Under Maintenance', 'Damaged', 'Missing', 'Unavailable'];
const DUE_SOON_HOURS          = 24;

// ---------------------------------------------------------------- codes
function tx_code(int $id): string   { return sprintf('TXN-%05d', $id); }
function case_code(int $id): string { return sprintf('CASE-%03d', $id); }
function canc_code(int $id): string { return sprintf('CANC-%03d', $id); }

// "TXN-00247", "txn247" or "247" -> 247 (else null)
function parse_tx_code(string $s): ?int
{
    return preg_match('/^(?:TXN-?)?0*(\d+)$/i', trim($s), $m) ? (int) $m[1] : null;
}

function last10(string $s): string { return substr(preg_replace('/\D/', '', $s), -10); }

// ---------------------------------------------------------------- audit trail
// $meta: ['type' => event type, 'student' => name, 'item' => name]
function log_audit(?array $actor, string $action, string $entity, $entityId = null, string $details = '', array $meta = []): void
{
    try {
        db()->prepare(
            'INSERT INTO audit_logs (user_id, role, action, entity, entity_id, details, event_type, student_name, item_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $actor['id'] ?? null, $actor['role'] ?? null, $action, $entity,
            $entityId !== null ? (string) $entityId : null,
            mb_substr($details, 0, 500),
            $meta['type'] ?? 'General', $meta['student'] ?? null, $meta['item'] ?? null,
        ]);
    } catch (Throwable $e) {
        // Logging must never break the request that is being logged.
    }
}

// Rows for admin History (auth events excluded) and Audit Trail (everything).
function query_audit(array $f, bool $excludeAuth, ?array $eventTypes = null): array
{
    $sql = 'SELECT a.id, a.created_at AS timestamp, COALESCE(u.full_name, \'System\') AS user, a.role, a.action,
                   a.entity, a.entity_id, a.details, a.event_type, a.student_name, a.item_name
            FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1';
    $p = [];
    if ($excludeAuth)         { $sql .= " AND a.event_type <> 'Auth'"; }
    if ($eventTypes)          { $sql .= ' AND a.event_type IN (' . implode(',', array_fill(0, count($eventTypes), '?')) . ')'; array_push($p, ...$eventTypes); }
    if (!empty($f['date']))   { $sql .= ' AND DATE(a.created_at) = ?'; $p[] = $f['date']; }
    if (!empty($f['from']))   { $sql .= ' AND DATE(a.created_at) >= ?'; $p[] = $f['from']; }
    if (!empty($f['to']))     { $sql .= ' AND DATE(a.created_at) <= ?'; $p[] = $f['to']; }
    if (!empty($f['action'])) { $sql .= ' AND a.action LIKE ?'; $p[] = $f['action'] . '%'; }
    if (!empty($f['type']))   { $sql .= ' AND a.event_type = ?'; $p[] = $f['type']; }
    if (!empty($f['q'])) {
        $sql .= ' AND (a.details LIKE ? OR a.entity_id LIKE ? OR a.student_name LIKE ? OR a.item_name LIKE ? OR u.full_name LIKE ?)';
        $like = '%' . $f['q'] . '%';
        array_push($p, $like, $like, $like, $like, $like);
    }
    $limit = max(1, min(2000, (int) ($f['limit'] ?? 500)));
    $stmt = db()->prepare($sql . ' ORDER BY a.created_at DESC, a.id DESC LIMIT ' . $limit);
    $stmt->execute($p);
    return $stmt->fetchAll();
}

// ---------------------------------------------------------------- notifications
// $alertKey de-duplicates automatic alerts (unique per user).
function notify(int $userId, string $message, string $type = 'info', ?int $txId = null, ?string $alertKey = null): void
{
    try {
        db()->prepare('INSERT IGNORE INTO notifications (user_id, message, type, transaction_id, alert_key) VALUES (?, ?, ?, ?, ?)')
            ->execute([$userId, mb_substr($message, 0, 500), $type, $txId, $alertKey]);
    } catch (Throwable $e) {
    }
}

function notify_role(string $role, string $message, string $type = 'info', ?int $txId = null): void
{
    $ids = db()->prepare('SELECT id FROM users WHERE role = ? AND is_active = 1');
    $ids->execute([$role]);
    foreach ($ids->fetchAll(PDO::FETCH_COLUMN) as $id) {
        notify((int) $id, $message, $type, $txId);
    }
}

// Overdue & due-soon alerts. There is no cron job, so this runs lazily whenever
// notifications or a dashboard are loaded. alert_key makes it fire once per transaction.
function generate_due_alerts(PDO $pdo, ?int $userId = null): void
{
    $sql = "SELECT t.id, t.user_id, i.name, t.expected_return_date,
                   (t.expected_return_date < NOW()) AS overdue
            FROM transactions t JOIN inventories i ON i.id = t.inventory_id
            WHERE t.status = 'active' AND t.expected_return_date IS NOT NULL
              AND t.expected_return_date < DATE_ADD(NOW(), INTERVAL " . DUE_SOON_HOURS . " HOUR)";
    $p = [];
    if ($userId !== null) { $sql .= ' AND t.user_id = ?'; $p[] = $userId; }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($p);
    foreach ($stmt->fetchAll() as $r) {
        if ($r['overdue']) {
            notify((int) $r['user_id'], $r['name'] . ' is overdue. Please return it immediately.', 'alert', (int) $r['id'], 'overdue-' . $r['id']);
        } else {
            notify((int) $r['user_id'], $r['name'] . ' is due on ' . date('M j, Y g:i A', strtotime($r['expected_return_date'])) . '.', 'reminder', (int) $r['id'], 'due-' . $r['id']);
        }
    }
}

// ---------------------------------------------------------------- items / categories
const ITEM_SELECT = "i.id, i.item_code, i.name, i.category, i.description, i.stock, i.item_condition,
        i.is_available, i.availability_status, i.image_path,
        COALESCE(i.requires_waiver, c.requires_waiver, 0)             AS requires_waiver,
        COALESCE(i.requires_id_surrender, c.requires_id_surrender, 0) AS requires_id_surrender,
        COALESCE(c.max_active_borrows, 2)                             AS max_active_borrows";
const ITEM_FROM = 'FROM inventories i LEFT JOIN categories c ON c.name = i.category';

// Adds 'status' = available | borrowed | unavailable  (the catalog badge).
function decorate_item(array $it): array
{
    $can = $it['is_available'] && $it['availability_status'] === 'Available' && (int) $it['stock'] > 0;
    $it['can_borrow'] = $can;
    $it['status'] = $can ? 'available' : ($it['availability_status'] !== 'Available' ? 'unavailable' : 'borrowed');
    return $it;
}

function category_names(): array
{
    return db()->query('SELECT name FROM categories ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
}

function sync_availability(PDO $pdo, int $itemId): void
{
    $pdo->prepare("UPDATE inventories SET is_available = (availability_status = 'Available' AND stock > 0) WHERE id = ?")
        ->execute([$itemId]);
}

// ---------------------------------------------------------------- per-unit tracking (item_units)
// Every physical copy has its own ID (AC-001-01, AC-001-02, ...). A request holds ONE unit from the moment it is
// submitted, so testers approving / rejecting / cancelling different requests never touch the same copy.
// inventories.stock is kept equal to the number of units with status 'available'.
// Call these inside a DB transaction (they use SELECT ... FOR UPDATE).

// Locks and reserves one free unit of an item. Returns ['id' =>, 'unit_code' =>] or null when none is free.
function reserve_unit(PDO $pdo, int $itemId): ?array
{
    $s = $pdo->prepare("SELECT id, unit_code FROM item_units WHERE inventory_id = ? AND status = 'available' ORDER BY unit_no LIMIT 1 FOR UPDATE");
    $s->execute([$itemId]);
    $u = $s->fetch();
    if (!$u) return null;
    $pdo->prepare("UPDATE item_units SET status = 'reserved' WHERE id = ?")->execute([$u['id']]);
    return $u;
}

// Sets one unit's status (available | reserved | borrowed | lost) and optionally its condition.
function set_unit_status(PDO $pdo, ?int $unitId, string $status, ?string $condition = null): void
{
    if (!$unitId) return;
    if ($condition !== null) {
        $pdo->prepare('UPDATE item_units SET status = ?, unit_condition = ? WHERE id = ?')->execute([$status, $condition, $unitId]);
    } else {
        $pdo->prepare('UPDATE item_units SET status = ? WHERE id = ?')->execute([$status, $unitId]);
    }
}

// stock = free units; also refreshes is_available.
function sync_stock(PDO $pdo, int $itemId): void
{
    $pdo->prepare("UPDATE inventories SET stock = (SELECT COUNT(*) FROM item_units WHERE inventory_id = ? AND status = 'available') WHERE id = ?")
        ->execute([$itemId, $itemId]);
    sync_availability($pdo, $itemId);
}

// Gives a transaction its unit back (rejected / cancelled). Works for older rows that have no unit_id too.
function release_tx_unit(PDO $pdo, array $tx): void
{
    set_unit_status($pdo, isset($tx['unit_id']) ? (int) $tx['unit_id'] : null, 'available');
    sync_stock($pdo, (int) $tx['inventory_id']);
}

// The admin's "stock" number = units on the shelf. Adds new units, or removes shelf units that were never used in a transaction.
function resize_units(PDO $pdo, int $itemId, string $itemCode, int $total): void
{
    $c = $pdo->prepare("SELECT COUNT(*) FROM item_units WHERE inventory_id = ? AND status = 'available'");
    $c->execute([$itemId]);
    $have = (int) $c->fetchColumn();
    if ($total > $have) {
        $m = $pdo->prepare('SELECT COALESCE(MAX(unit_no), 0) FROM item_units WHERE inventory_id = ?');
        $m->execute([$itemId]);
        $n = (int) $m->fetchColumn();
        $ins = $pdo->prepare('INSERT INTO item_units (inventory_id, unit_no, unit_code) VALUES (?, ?, ?)');
        for ($k = 0; $k < $total - $have; $k++) {
            $n++;
            $ins->execute([$itemId, $n, $itemCode . '-' . str_pad((string) $n, 2, '0', STR_PAD_LEFT)]);
        }
    } elseif ($total < $have) {      // only units sitting on the shelf can be removed
        $pdo->prepare("DELETE FROM item_units WHERE inventory_id = ? AND status = 'available' AND id NOT IN (SELECT unit_id FROM (SELECT unit_id FROM transactions WHERE unit_id IS NOT NULL) z) ORDER BY unit_no DESC LIMIT " . ($have - $total))
            ->execute([$itemId]);
    }
    sync_stock($pdo, $itemId);
}

// ---------------------------------------------------------------- rules
// Office hours: Mon-Fri 8:00-11:30 AM and 1:00-5:00 PM. Saturday: Academic items only. Sunday closed.
// Returns an error string, or null when the schedule is acceptable.
function validate_schedule(DateTime $dt, string $category): ?string
{
    $dow  = (int) $dt->format('N');
    $mins = (int) $dt->format('G') * 60 + (int) $dt->format('i');
    if ($dow === 7) return 'The SAO Office is closed on Sundays';
    if ($dow === 6 && $category !== 'Academic') return 'Saturday borrowing is limited to Academic items';
    $ok = ($mins >= 8 * 60 && $mins <= 11 * 60 + 30) || ($mins >= 13 * 60 && $mins <= 17 * 60);
    return $ok ? null : 'Pick a time within office hours: Mon-Fri 8:00-11:30 AM and 1:00-5:00 PM';
}

// Student eligibility & campus validation.
// Returns ['allowed' => bool, 'reason' => string|null, 'label' => 'Allowed'|'Not allowed'].
function student_eligibility(PDO $pdo, int $userId, ?string $category = null, ?int $ignoreTxId = null): array
{
    $deny = fn(string $why) => ['allowed' => false, 'reason' => $why, 'label' => 'Not allowed'];

    $s = $pdo->prepare('SELECT role, is_active, is_flagged, campus FROM users WHERE id = ?');
    $s->execute([$userId]);
    $u = $s->fetch();
    if (!$u || $u['role'] !== 'student')   return $deny('Not a student account');
    if (!$u['is_active'])                  return $deny('Account is disabled');
    if ($u['is_flagged'])                  return $deny('Account is flagged. Please settle the accountability case with the SAO');
    // Accounts created before campuses were recorded have no campus; only a *wrong* campus is rejected.
    if (!empty($u['campus']) && !in_array($u['campus'], ALLOWED_CAMPUSES, true)) {
        return $deny('Campus is not eligible to borrow');
    }

    $q = $pdo->prepare("SELECT 1 FROM transactions WHERE user_id = ? AND status = 'active' AND expected_return_date < NOW() LIMIT 1");
    $q->execute([$userId]);
    if ($q->fetchColumn()) return $deny('You have an overdue item. Return it before borrowing again');

    $q = $pdo->prepare("SELECT 1 FROM accountability_cases WHERE user_id = ? AND status = 'Open' LIMIT 1");
    $q->execute([$userId]);
    if ($q->fetchColumn()) return $deny('You have an unresolved accountability case');

    if ($category !== null) {
        $m = $pdo->prepare('SELECT max_active_borrows FROM categories WHERE name = ?');
        $m->execute([$category]);
        $max = (int) ($m->fetchColumn() ?: 2);

        $sql = "SELECT COUNT(*) FROM transactions t JOIN inventories i ON i.id = t.inventory_id
                WHERE t.user_id = ? AND i.category = ? AND t.status IN ('pending','active')";
        $p = [$userId, $category];
        if ($ignoreTxId) { $sql .= ' AND t.id <> ?'; $p[] = $ignoreTxId; }
        $c = $pdo->prepare($sql);
        $c->execute($p);
        if ((int) $c->fetchColumn() >= $max) {
            return $deny("Limit reached: at most $max active $category borrowings per student");
        }
    }
    return ['allowed' => true, 'reason' => null, 'label' => 'Allowed'];
}

// Label shown to users. (Assumption: a returned item in Good condition is "Completed";
// a returned item that was Damaged/Lost shows as "Returned" and has an accountability case.)
function tx_display_status(array $t): string
{
    switch ($t['status']) {
        case 'pending':   return 'Pending';
        case 'active':    return !empty($t['is_overdue']) ? 'Overdue' : 'Borrowed';
        case 'returned':  return ($t['return_condition'] ?? 'Good') === 'Good' ? 'Completed' : 'Returned';
        case 'rejected':  return 'Rejected';
        case 'cancelled': return 'Cancelled';
    }
    return ucfirst((string) $t['status']);
}

// Open (or reuse) an accountability case and flag the student.
function open_case(PDO $pdo, array $tx, string $type, string $notes, ?array $actor): int
{
    $e = $pdo->prepare("SELECT id FROM accountability_cases WHERE transaction_id = ? AND type = ? AND status = 'Open'");
    $e->execute([$tx['id'], $type]);
    if ($id = $e->fetchColumn()) return (int) $id;

    $pdo->prepare('INSERT INTO accountability_cases (transaction_id, user_id, inventory_id, type, notes) VALUES (?, ?, ?, ?, ?)')
        ->execute([$tx['id'], $tx['user_id'], $tx['inventory_id'], $type, $notes ?: null]);
    $id = (int) $pdo->lastInsertId();
    $pdo->prepare('UPDATE users SET is_flagged = 1 WHERE id = ?')->execute([$tx['user_id']]);
    log_audit($actor, 'Opened Case', 'Accountability', case_code($id), "$type item on " . tx_code((int) $tx['id']), ['type' => 'Accountability']);
    notify_role('admin', 'New accountability case ' . case_code($id) . " ($type) was opened.", 'alert', (int) $tx['id']);
    return $id;
}

// ---------------------------------------------------------------- export (CSV / PDF)
function wants_export(): ?string
{
    $f = strtolower((string) ($_GET['format'] ?? ''));
    return in_array($f, ['csv', 'pdf'], true) ? $f : null;
}

function output_table(string $format, string $filename, string $title, array $headers, array $rows): void
{
    if ($format === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");                     // UTF-8 BOM so Excel reads it correctly
        fputcsv($out, $headers);
        foreach ($rows as $r) {
            // Neutralise spreadsheet formula injection.
            fputcsv($out, array_map(fn($v) => (is_string($v) && preg_match('/^[=+\-@]/', $v)) ? "'" . $v : $v, $r));
        }
        fclose($out);
        exit;
    }
    require_once __DIR__ . '/pdf.php';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '.pdf"');
    echo simple_pdf($title, $headers, $rows);
    exit;
}