<?php
// Database connection. Credentials are NOT stored here: each teammate keeps
// their own in backend/config.php (git-ignored, never pushed).
// First time on a new machine: copy config.example.php to config.php and edit it.

$cfgFile = __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? include $cfgFile : [];
if (!is_array($cfg)) $cfg = [];

$host    = $cfg['host']   ?? '127.0.0.1';
$port    = $cfg['port']   ?? 3306;
$db      = $cfg['dbname'] ?? 'webventory';
$user    = $cfg['user']   ?? 'root';
$pass    = $cfg['pass']   ?? '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
function db(): PDO { global $pdo; return $pdo; }

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    $hint = is_file($cfgFile) ? '' : ' (backend/config.php is missing - copy config.example.php to config.php)';
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage() . $hint]);
    exit;
}