<?php
require_once __DIR__ . '/../auth.php';
require_role('student');
require __DIR__ . '/../api/profile.php';   // GET profile / POST update username, mobile, or password