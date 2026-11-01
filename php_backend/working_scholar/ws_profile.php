<?php
// Include session authentication and database connection
include_once __DIR__ . '/ws_auth.php';
check_working_scholar_auth(); // Ensure user is logged in

$user_id = $_SESSION['user_id'];
$success_message = "";
$error_message = "";

// 1. Fetch current user profile details
try {
    $stmt = $conn->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $scholar_profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$scholar_profile) {
        $error_message = "User profile not found.";
    }
} catch (PDOException $e) {
    $error_message = "Database error: " . $e->getMessage();
}

// 2. Handle Profile Update Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_profile'])) {
    $new_name = trim($_POST['name']);
    $new_email = trim($_POST['email']);
    $current_password = $_POST['current_password'];
    $new_password = $_POST['new_password'];

    try {
        // Validate inputs
        if (empty($new_name) || empty($new_email)) {
            $error_message = "Name and email cannot be empty.";
        } else {
            // Optional: If updating password, verify current password first
            if (!empty($new_password)) {
                $stmt_pass = $conn->prepare("SELECT password FROM users WHERE id = ?");
                $stmt_pass->execute([$user_id]);
                $user_data = $stmt_pass->fetch(PDO::FETCH_ASSOC);

                // Assuming you use password_verify()
                if ($user_data && password_verify($current_password, $user_data['password'])) {
                    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
                    
                    $update_stmt = $conn->prepare("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?");
                    $update_stmt->execute([$new_name, $new_email, $hashed_password, $user_id]);
                    $success_message = "Profile and password updated successfully!";
                } else {
                    $error_message = "Incorrect current password.";
                }
            } else {
                // Update profile without changing password
                $update_stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
                $update_stmt->execute([$new_name, $new_email, $user_id]);
                $success_message = "Profile updated successfully!";
            }

            // Refresh profile data array after update
            $stmt = $conn->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $scholar_profile = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    } catch (PDOException $e) {
        $error_message = "Update failed: " . $e->getMessage();
    }
}
?>