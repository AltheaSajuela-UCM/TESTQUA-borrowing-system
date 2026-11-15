<?php
require_once __DIR__ . '/../helpers.php';
require_role('working_scholar');
require_method('GET');

// Student Verification box on Process Request: GET ?student_id=2024xxxx
// -> student details + eligibility ("Allowed" badge). Optional ?category=Non-Academic checks the borrowing limit too.
$sid = trim((string) ($_GET['student_id'] ?? ''));
if ($sid === '') respond(['error' => 'student_id is required'], 400);

$s = db()->prepare("SELECT id, id_number, full_name, email, mobile_number, campus, academic_level, is_flagged
                    FROM users WHERE id_number = ? AND role = 'student'");
$s->execute([$sid]);
$st = $s->fetch();
if (!$st) respond(['error' => 'Student not found'], 404);

$elig = student_eligibility(db(), (int) $st['id'], $_GET['category'] ?? null);
unset($st['id']);
respond(['student' => $st, 'eligibility' => $elig]);
