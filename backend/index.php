<?php
require_once __DIR__ . '/logic.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET' && $path === '/api/admin/dashboard') {
        respond(getDashboardMetrics());
    }

    if ($method === 'POST' && $path === '/api/admin/borrow') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!isset($body['userIdNumber'], $body['itemId'], $body['expectedReturnDate'])) {
            respond(['error' => 'userIdNumber, itemId and expectedReturnDate are required'], 400);
        }

        $date = date_create($body['expectedReturnDate']);
        if (!$date) {
            respond(['error' => 'Invalid expectedReturnDate'], 400);
        }

        $tx = processBorrow(
            (string) $body['userIdNumber'],
            (int) $body['itemId'],
            $date->format('Y-m-d H:i:s')
        );
        respond($tx, 201);
    }

    respond(['error' => 'Not found'], 404);
} catch (InvalidArgumentException $e) {
    respond(['error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    respond(['error' => 'Server error'], 500);
}