<?php
// Admin "Transactions" view: same data and filters as the Working Scholar borrowing endpoint
// (GET ?status=&view=&q=&id=&format=csv|pdf). Admins can read everything and use action 'set_schedule';
// releasing / returning items stays Working-Scholar-only (enforced inside borrowing.php).
require_once __DIR__ . '/../helpers.php';
require_role('admin');
require __DIR__ . '/../2_working_scholar/borrowing.php';
