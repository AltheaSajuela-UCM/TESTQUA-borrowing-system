<?php
// Shared helpers: sessions, JSON responses, and role guards.
require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('Content-Type: application/json');

function respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        respond(['error' => 'Method not allowed'], 405);
    }
}

// Returns the logged-in user (fresh from the DB) or null.
function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $stmt = db()->prepare(
        'SELECT id, id_number, username, full_name, role, mobile_number FROM users WHERE id = ?'
    );
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        respond(['error' => 'Not logged in'], 401);
    }
    return $user;
}

// Usage: $user = require_role('admin');  or  require_role('admin', 'working_scholar');
function require_role(string ...$roles): array
{
    $user = require_login();
    if (!in_array($user['role'], $roles, true)) {
        respond(['error' => 'Forbidden'], 403);
    }
    return $user;
}