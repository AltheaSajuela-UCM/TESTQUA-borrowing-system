<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webventory: Working Scholar Portal</title>
    <link rel="stylesheet" href="../../css_files/working_scholar_style/account_setting/working_scholar_account_setting_body.css">
    <!-- FontAwesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>

    <!-- Sidebar Menu Drawer -->
    <aside id="sidebar" class="sidebar closed">
        <div class="sidebar-header">
            <div class="brand-title">
                <span class="logo-icon">W</span>
                <div>
                    <h3>Webventory</h3>
                    <p>SAO Working Scholar</p>
                </div>
            </div>
            <button id="close-sidebar-btn" class="close-btn">Close</button>
        </div>
            <nav class="sidebar-nav">
                <!-- CHANGE THIS FROM .html TO .php -->
                <a href="working_scholar_dashboard.php" class="nav-item"><i class="fa-solid fa-table-cells-large"></i> Dashboard</a>
                <a href="working_scholar_requests.php" class="nav-item"><i class="fa-solid fa-clock"></i> Pending Requests</a>
                <a href="working_scholar_cancellations.php" class="nav-item"><i class="fa-solid fa-ban"></i> Cancellation Requests</a>
                <a href="working_scholar_inventory.php" class="nav-item"><i class="fa-solid fa-boxes-stacked"></i> Inventory</a>
                <a href="working_scholar_borrowed.php" class="nav-item"><i class="fa-solid fa-clipboard-list"></i> Borrowed Items</a>
                <a href="working_scholar_returns.php" class="nav-item"><i class="fa-solid fa-rotate-left"></i> Return Processing</a>
                <a href="working_scholar_history.php" class="nav-item"><i class="fa-solid fa-history"></i> History</a>
            </nav>
        <div class="sidebar-footer">
            <button class="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
    </aside>

    <!-- Overlay when sidebar is open -->
    <div id="sidebar-overlay" class="overlay hidden"></div>

    <!-- Top Navigation Bar -->
    <header class="navbar">
        <div class="nav-left">
            <button id="menu-btn" class="menu-btn">
                <i class="fa-solid fa-bars"></i> Menu
            </button>
            <span class="portal-title">Webventory: Working Scholar Portal</span>
        </div>
        <div class="nav-right">
            <button class="notif-btn" aria-label="Notifications">
                <i class="fa-regular fa-bell"></i>
            </button>
            
            <!-- Profile Dropdown Container -->
            <div class="profile-dropdown-container">
                <button id="profile-menu-btn" class="profile-btn">
                    <span class="avatar-initials">AR</span>
                    <span class="profile-text">Profile</span>
                    <i class="fa-solid fa-chevron-down chevron-icon"></i>
                </button>
                
                <!-- Dropdown Menu -->
                <div id="profile-dropdown" class="dropdown-menu hidden">
                    <a href="working_scholar_account_setting.html" class="dropdown-item">Account Settings</a>
                    <a href="#logout" class="dropdown-item">Logout</a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="main-content">
        <div class="content-header">
            <div>
                <h1>Account Settings</h1>
                <p>Review and maintain your profile and contact information.</p>
            </div>
            <button id="edit-btn" class="btn-primary">Edit Account Settings</button>
        </div>

        <!-- Settings Card -->
        <div class="card">
            <div class="user-header">
                <div class="user-avatar-large">AR</div>
                <div class="user-info">
                    <h2>Ana Reyes</h2>
                    <span class="user-role">Working Scholar</span>
                </div>
            </div>

            <hr class="divider">

            <!-- Profile Form Fields -->
            <form id="settings-form" class="form-grid">
                <div class="form-group">
                    <label for="full-name">Full Name</label>
                    <input type="text" id="full-name" value="Ana Reyes" disabled>
                </div>
                <div class="form-group">
                    <label for="scholar-id">Working Scholar ID</label>
                    <input type="text" id="scholar-id" value="00000001" disabled>
                </div>
                <div class="form-group full-width">
                    <label for="mobile-number">Mobile Number</label>
                    <input type="text" id="mobile-number" value="09175550101" disabled>
                </div>
                <div class="form-group full-width">
                    <label for="program-year">Program and Year</label>
                    <input type="text" id="program-year" value="" placeholder="Enter program and year" disabled>
                </div>
            </form>
        </div>
    </main>

    <script src="../../script_files/working_scholar_script/account_setting/working_scholar_all_in_one.js"></script>
</body>
</html>