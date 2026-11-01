<?php
// Start session securely if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include database connection
include_once __DIR__ . '/../db_connect.php';

/**
 * Function to check if a working scholar is logged in
 */
function check_working_scholar_auth() {
    // Check if session variables exist (modify 'user_role' or 'user_id' based on your login schema)
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'working_scholar') {
        // Redirect unauthorized users to the main login page
        header("Location: ../../html_files/login.php?error=unauthorized");
        exit();
    }
}

/**
 * Function to handle secure logout
 */
function handle_logout() {
    $_SESSION = array();
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    header("Location: ../../html_files/login.php?logged_out=true");
    exit();
}
?>