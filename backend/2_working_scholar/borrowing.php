<?php
require_once __DIR__ . '/../auth.php';
$user = require_role('working_scholar');

// GET  : list transactions (?status=pending|active|returned|rejected|cancelled|all, default pending)
// POST : {transaction_id, action:'approve'}
//        {transaction_id, action:'reject', reject_reason?}
//        {transaction_id, action:'return', return_condition?: Good|Damaged|Lost}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? 'pending';
    $sql = 'SELECT t.id, t.status, t.requested_at, t.processed_at, t.expected_return_date,
                   t.returned_at, t.reject_reason, t.return_condition, t.notes,
                   u.id_number AS user_id_number, u.full_name AS borrower,
                   i.id AS item_id, i.item_code, i.name AS item_name, i.stock,
                   (t.status = "active" AND t.expected_return_date < NOW()) AS is_overdue
            FROM transactions t
            JOIN inventories i ON i.id = t.inventory_id
            JOIN users u ON u.id = t.user_id';
    $params = [];
    if ($status !== 'all') {
        $sql .= ' WHERE t.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY t.requested_at DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    respond(['borrowings' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_body();
    $txId   = (int) ($body['transaction_id'] ?? 0);
    $action = (string) ($body['action'] ?? '');
    $pdo    = db();

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM transactions WHERE id = ? FOR UPDATE');
        $stmt->execute([$txId]);
        $tx = $stmt->fetch();
        if (!$tx) {
            throw new InvalidArgumentException('Transaction not found');
        }

        $itemStmt = $pdo->prepare('SELECT * FROM inventories WHERE id = ? FOR UPDATE');
        $itemStmt->execute([$tx['inventory_id']]);
        $item = $itemStmt->fetch();

        if ($action === 'approve') {
            if ($tx['status'] !== 'pending') throw new InvalidArgumentException('Only pending requests can be approved');
            if ($item['stock'] < 1)          throw new InvalidArgumentException('Item is out of stock');
            $new = $item['stock'] - 1;
            $pdo->prepare('UPDATE inventories SET stock = ?, is_available = ? WHERE id = ?')
                ->execute([$new, $new > 0 ? 1 : 0, $item['id']]);
            $pdo->prepare("UPDATE transactions SET status = 'active', processed_by = ?, processed_at = NOW() WHERE id = ?")
                ->execute([$user['id'], $txId]);

        } elseif ($action === 'reject') {
            if ($tx['status'] !== 'pending') throw new InvalidArgumentException('Only pending requests can be rejected');
            $reason = trim((string) ($body['reject_reason'] ?? ''));
            $pdo->prepare("UPDATE transactions SET status = 'rejected', reject_reason = ?, processed_by = ?, processed_at = NOW() WHERE id = ?")
                ->execute([$reason !== '' ? $reason : null, $user['id'], $txId]);

        } elseif ($action === 'return') {
            if ($tx['status'] !== 'active') throw new InvalidArgumentException('Only active borrowings can be returned');
            $cond = (string) ($body['return_condition'] ?? 'Good');
            if (!in_array($cond, ['Good', 'Damaged', 'Lost'], true)) {
                throw new InvalidArgumentException("return_condition must be 'Good', 'Damaged' or 'Lost'");
            }
            // A lost item does not go back into stock.
            if ($cond !== 'Lost') {
                $pdo->prepare('UPDATE inventories SET stock = stock + 1, is_available = 1 WHERE id = ?')
                    ->execute([$item['id']]);
            }
            $pdo->prepare("UPDATE transactions SET status = 'returned', returned_at = NOW(), received_by = ?, return_condition = ? WHERE id = ?")
                ->execute([$user['id'], $cond, $txId]);

        } else {
            throw new InvalidArgumentException("action must be 'approve', 'reject' or 'return'");
        }

        $pdo->commit();
        respond(['success' => true, 'action' => $action]);
    } catch (InvalidArgumentException $e) {
        $pdo->rollBack();
        respond(['error' => $e->getMessage()], 400);
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['error' => 'Server error'], 500);
    }
}

respond(['error' => 'Method not allowed'], 405);