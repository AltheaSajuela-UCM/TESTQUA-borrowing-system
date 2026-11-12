<?php
require_once __DIR__ . '/../auth.php';
require_method('POST');

$_SESSION = [];
session_destroy();
respond(['success' => true]);
