<?php
// Copy this file to config.php and put YOUR OWN local MySQL details here.
// config.php is git-ignored, so your password never goes to GitHub.
return [
    'host'   => '127.0.0.1',
    'port'   => 3306,
    'dbname' => 'webventory',
    'user'   => 'root',          // or the dedicated user you created
    'pass'   => 'your-mysql-password',

    // Optional app settings (see helpers.php):
    // 'admin_access_code'      => 'SAO-ADMIN-2026',
    // 'ws_requires_activation' => true,
    // 'recovery_dev_mode'      => true,
];