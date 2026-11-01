<?php
// Include the auth file that contains the logout function
include_once __DIR__ . '/ws_auth.php';

// Execute the secure logout function to destroy session and cookies
handle_logout();
?>