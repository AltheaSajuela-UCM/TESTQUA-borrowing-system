<?php
// Student notifications, built from the student's own transactions
// (no schema change needed: the notifications table has no user_id).
// GET -> { owner, notifications: [{id, message, time, alert, icon}] }
// ids are numeric and stable: transaction id * 10 + kind
//   1 pending, 2 approved, 3 overdue, 4 rejected, 5 returned
require_once __DIR__ . '/../auth.php';
$user = require_role('student');
require_method('GET');

$stmt = db()->prepare(
    "SELECT t.id, t.status, t.requested_at, t.processed_at, t.expected_return_date,
            t.returned_at, t.reject_reason, t.return_condition,
            i.name AS item_name,
            COALESCE(t.expected_return_date < NOW(), 0) AS is_overdue
     FROM transactions t
     JOIN inventories i ON i.id = t.inventory_id
     WHERE t.user_id = ?
     ORDER BY t.requested_at DESC
     LIMIT 100"
);
$stmt->execute([$user['id']]);

$out = [];
foreach ($stmt->fetchAll() as $t) {
    $id   = (int) $t['id'];
    $name = $t['item_name'];

    switch ($t['status']) {
        case 'pending':
            $out[] = [
                'id' => $id * 10 + 1, 'alert' => false, 'icon' => '🕒',
                'message' => "Your request for $name is waiting for approval.",
                'time' => $t['requested_at'],
            ];
            break;

        case 'active':
            $by = $t['expected_return_date'] ? ' Return it by ' . substr($t['expected_return_date'], 0, 10) . '.' : '';
            $out[] = [
                'id' => $id * 10 + 2, 'alert' => false, 'icon' => '✅',
                'message' => "Your request for $name was approved.$by",
                'time' => $t['processed_at'] ?: $t['requested_at'],
            ];
            if ((int) $t['is_overdue'] === 1) {
                $out[] = [
                    'id' => $id * 10 + 3, 'alert' => true, 'icon' => '⚠️',
                    'message' => "$name is overdue. Return it to the SAO Office immediately.",
                    'time' => $t['expected_return_date'],
                ];
            }
            break;

        case 'rejected':
            $why = trim((string) $t['reject_reason']);
            $out[] = [
                'id' => $id * 10 + 4, 'alert' => false, 'icon' => '❌',
                'message' => "Your request for $name was rejected" . ($why !== '' ? ": $why" : '.'),
                'time' => $t['processed_at'] ?: $t['requested_at'],
            ];
            break;

        case 'returned':
            $cond = $t['return_condition'] ?: 'Good';
            $bad  = $cond !== 'Good';
            $out[] = [
                'id' => $id * 10 + 5, 'alert' => $bad, 'icon' => '📦',
                'message' => $bad
                    ? "$name was returned and marked $cond. Please see the SAO Office."
                    : "$name was returned. Thank you!",
                'time' => $t['returned_at'] ?: $t['requested_at'],
            ];
            break;
        // 'cancelled' is the student's own action - no notification.
    }
}

usort($out, fn($a, $b) => strcmp((string) $b['time'], (string) $a['time']));

respond([
    'owner'         => $user['id_number'],
    'notifications' => array_slice($out, 0, 30),
]);
