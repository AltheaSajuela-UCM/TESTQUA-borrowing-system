<?php
// Browse Academic / Non-Academic items, Search & Filter, View Item Details, Submit Borrow Request.
// GET  ?category=Academic&q=calc     -> {items:[... + requires_waiver, requires_id_surrender, can_borrow, status], eligibility}
// POST {item_id, expected_return_date, waiver_accepted?}   -> status 'pending'  (waiver_accepted is required when the item needs one)
require_once __DIR__ . '/../helpers.php';
$user = require_role('student');
$pdo  = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = 'SELECT ' . ITEM_SELECT . ' ' . ITEM_FROM . ' WHERE 1=1';
    $p = [];
    if (!empty($_GET['category'])) { $sql .= ' AND i.category = ?'; $p[] = $_GET['category']; }
    $q = $_GET['q'] ?? $_GET['search'] ?? '';
    if ($q !== '') {
        $sql .= ' AND (i.name LIKE ? OR i.item_code LIKE ? OR i.description LIKE ?)';
        array_push($p, "%$q%", "%$q%", "%$q%");
    }
    $stmt = $pdo->prepare($sql . ' ORDER BY i.name');
    $stmt->execute($p);
    respond([
        'items'       => array_map('decorate_item', $stmt->fetchAll()),
        'eligibility' => student_eligibility($pdo, (int) $user['id']),   // {allowed, reason} -> banner on the page
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b      = json_body();
    $itemId = (int) ($b['item_id'] ?? 0);
    $date   = date_create((string) ($b['expected_return_date'] ?? ''));
    if ($itemId < 1 || !$date)       respond(['error' => 'item_id and a valid expected_return_date are required'], 400);
    if ($date <= new DateTime('now')) respond(['error' => 'Return date must be in the future'], 400);

    $stmt = $pdo->prepare('SELECT ' . ITEM_SELECT . ' ' . ITEM_FROM . ' WHERE i.id = ?');
    $stmt->execute([$itemId]);
    $item = $stmt->fetch();
    if (!$item || !decorate_item($item)['can_borrow']) respond(['error' => 'Item is unavailable'], 409);

    // Eligibility & campus validation: overdue items, open cases, flagged/disabled account, category limit
    $elig = student_eligibility($pdo, (int) $user['id'], $item['category']);
    if (!$elig['allowed']) respond(['error' => $elig['reason'], 'eligibility' => $elig], 409);

    // Digital waiver & terms acknowledgement
    if ($item['requires_waiver'] && empty($b['waiver_accepted'])) {
        respond(['error' => 'Please read and accept the waiver to borrow this item', 'requires_waiver' => true], 422);
    }

    $dup = $pdo->prepare("SELECT 1 FROM transactions WHERE user_id = ? AND inventory_id = ? AND status IN ('pending','active')");
    $dup->execute([$user['id'], $itemId]);
    if ($dup->fetchColumn()) respond(['error' => 'You already have a pending or active request for this item'], 409);

    // Each request holds its own physical copy (unit) right away, so approvals/rejections by other
    // testers can never leave this request without an item. The unit goes back on reject / cancel / return.
    $pdo->beginTransaction();
    try {
        $unit = reserve_unit($pdo, $itemId);
        if (!$unit) { $pdo->rollBack(); respond(['error' => 'All copies of this item are taken right now'], 409); }
        $pdo->prepare("INSERT INTO transactions (user_id, inventory_id, unit_id, status, expected_return_date, waiver_accepted_at)
                       VALUES (?, ?, ?, 'pending', ?, ?)")
            ->execute([$user['id'], $itemId, $unit['id'], $date->format('Y-m-d H:i:s'), $item['requires_waiver'] ? date('Y-m-d H:i:s') : null]);
        $txId = (int) $pdo->lastInsertId();
        sync_stock($pdo, $itemId);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['error' => 'Server error'], 500);
    }

    log_audit($user, 'Submitted Request', 'Transaction', tx_code($txId), 'Requested ' . $item['name'] . ' (' . $unit['unit_code'] . ')',
              ['type' => 'Borrow Request', 'student' => $user['full_name'], 'item' => $item['name']]);
    notify_role('working_scholar', $user['full_name'] . ' requested ' . $item['name'] . '.', 'info', $txId);

    respond([
        'success' => true, 'transaction_id' => $txId, 'transaction_code' => tx_code($txId), 'unit_code' => $unit['unit_code'], 'status' => 'pending',
        'requires_id_surrender' => (bool) $item['requires_id_surrender'],   // tell the student to bring their ID
    ], 201);
}

respond(['error' => 'Method not allowed'], 405);
