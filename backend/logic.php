<?php
require_once __DIR__ . '/db.php';

function getDashboardMetrics(): array
{
    $pdo = db();

    $total = (int) $pdo->query("SELECT COALESCE(SUM(stock), 0) FROM inventories")->fetchColumn();
    $academic = (int) $pdo->query(
        "SELECT COALESCE(SUM(stock), 0) FROM inventories WHERE category = 'Academic'"
    )->fetchColumn();
    $active = (int) $pdo->query(
        "SELECT COUNT(*) FROM transactions WHERE status = 'active'"
    )->fetchColumn();

    return [
        'totalItems'         => $total,
        'activeTransactions' => $active,
        'academicPct'        => $total > 0 ? (int) round($academic / $total * 100) : 0,
        'nonAcademicPct'     => $total > 0 ? (int) round(($total - $academic) / $total * 100) : 0,
    ];
}

function processBorrow(string $userIdNumber, int $itemId, string $returnDate): array
{
    $pdo = db();
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("SELECT * FROM inventories WHERE id = ? FOR UPDATE");
        $stmt->execute([$itemId]);
        $item = $stmt->fetch();

        if (!$item) {
            throw new InvalidArgumentException('Item missing from stock lists.');
        }
        if (!$item['is_available'] || $item['stock'] < 1) {
            throw new InvalidArgumentException('Item is depleted or unavailable.');
        }

        $newStock = $item['stock'] - 1;
        $pdo->prepare("UPDATE inventories SET stock = ?, is_available = ? WHERE id = ?")
            ->execute([$newStock, $newStock > 0 ? 1 : 0, $itemId]);

        $pdo->prepare(
            "INSERT INTO transactions (user_id_number, inventory_id, expected_return_date)
             VALUES (?, ?, ?)"
        )->execute([$userIdNumber, $itemId, $returnDate]);

        $txId = (int) $pdo->lastInsertId();
        $pdo->commit();

        return [
            'id'                 => $txId,
            'userIdNumber'       => $userIdNumber,
            'item'               => [
                'id'            => (int) $item['id'],
                'itemCode'      => $item['item_code'],
                'name'          => $item['name'],
                'category'      => $item['category'],
                'stock'         => $newStock,
                'itemCondition' => $item['item_condition'],
                'isAvailable'   => $newStock > 0,
            ],
            'status'             => 'active',
            'expectedReturnDate' => $returnDate,
        ];
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}