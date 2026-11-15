<?php
// Per-user notifications from the notifications table (used by Working Scholar + Admin; students may use it too).
// GET  ?filter=all|unread|alerts  [&limit=30]   -> {notifications:[...], unread_count}
// POST {action:'read', id}  |  {action:'read_all'}
require_once __DIR__ . '/../helpers.php';
$user = require_login();
$pdo  = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($user['role'] === 'student') generate_due_alerts($pdo, (int) $user['id']);
    $sql = 'SELECT id, message, type, is_read, transaction_id, created_at FROM notifications WHERE user_id = ?';
    $f = $_GET['filter'] ?? 'all';
    if ($f === 'unread') $sql .= ' AND is_read = 0';
    if ($f === 'alerts') $sql .= " AND type = 'alert'";
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 30)));
    $s = $pdo->prepare($sql . ' ORDER BY created_at DESC, id DESC LIMIT ' . $limit);
    $s->execute([$user['id']]);
    $rows = array_map(fn($r) => [
        'id' => (int) $r['id'], 'message' => $r['message'], 'type' => $r['type'], 'alert' => $r['type'] === 'alert',
        'is_read' => (bool) $r['is_read'], 'transaction_id' => $r['transaction_id'] ? (int) $r['transaction_id'] : null,
        'created_at' => $r['created_at'],
    ], $s->fetchAll());
    $u = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
    $u->execute([$user['id']]);
    respond(['notifications' => $rows, 'unread_count' => (int) $u->fetchColumn()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = json_body();
    if (($b['action'] ?? '') === 'read_all') {
        $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([$user['id']]);
        respond(['success' => true]);
    }
    if (($b['action'] ?? '') === 'read') {
        $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')->execute([(int) ($b['id'] ?? 0), $user['id']]);
        respond(['success' => true]);
    }
    respond(['error' => "action must be 'read' or 'read_all'"], 400);
}
respond(['error' => 'Method not allowed'], 405);
