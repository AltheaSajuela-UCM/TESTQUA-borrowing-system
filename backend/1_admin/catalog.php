<?php
// The old version of this file redeclared respond() (fatal error) and read a session key that is never set.
// Admin catalog/inventory now live in inventory.php; this file only forwards to it.
require __DIR__ . '/inventory.php';
