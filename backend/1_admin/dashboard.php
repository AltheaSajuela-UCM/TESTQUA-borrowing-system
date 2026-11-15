<?php
require_once __DIR__ . '/../auth.php';
require_role('admin');
require __DIR__ . '/../api/dashboard.php';   // returns the admin numbers (session role = admin)
