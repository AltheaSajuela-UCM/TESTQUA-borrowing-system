<?php
require_once __DIR__ . '/../auth.php';
require_method('GET');
$user = require_login();

$pdo = db();

function count_of(PDO $pdo, string $sql, array $params = []): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}

switch ($user['role']) {
    case 'admin':
        $total    = count_of($pdo, 'SELECT COALESCE(SUM(stock), 0) FROM inventories');
        $academic = count_of($pdo, "SELECT COALESCE(SUM(stock), 0) FROM inventories WHERE category = 'Academic'");
        respond([
            'role'               => 'admin',
            'totalUsers'         => count_of($pdo, 'SELECT COUNT(*) FROM users'),
            'totalItems'         => $total,
            'activeTransactions' => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'active'"),
            'pendingRequests'    => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
            'overdue'            => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date < NOW()"),
            'academicPct'        => $total > 0 ? (int) round($academic / $total * 100) : 0,
            'nonAcademicPct'     => $total > 0 ? (int) round(($total - $academic) / $total * 100) : 0,
        ]);

    case 'working_scholar':
        respond([
            'role'               => 'working_scholar',
            'pendingRequests'    => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
            'activeTransactions' => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'active'"),
            'overdue'            => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'active' AND expected_return_date < NOW()"),
            'returnedToday'      => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE status = 'returned' AND DATE(returned_at) = CURDATE()"),
        ]);

    default: // student
        $id = $user['id'];
        respond([
            'role'        => 'student',
            'activeLoans' => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = 'active'", [$id]),
            'pending'     => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = 'pending'", [$id]),
            'overdue'     => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = 'active' AND expected_return_date < NOW()", [$id]),
            'history'     => count_of($pdo, "SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = 'returned'", [$id]),
        ]);
}