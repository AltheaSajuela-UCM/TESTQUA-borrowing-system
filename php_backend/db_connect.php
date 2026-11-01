<?php
// db_connect.php - Database Connection Configuration
$host = "localhost";
$username = "root";
$password = "MEKIT@Root"; // Change to your actual standalone MySQL password
$database = "testqua_db";                    // Your database name

try {
    $conn = new PDO("mysql:host=$host;dbname=$database;charset=utf8", $username, $password);
    // Set PDO error mode to exception for better debugging
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // If connection fails, stop execution and show error
    die("Database Connection Failed: " . $e->getMessage());
}
?>