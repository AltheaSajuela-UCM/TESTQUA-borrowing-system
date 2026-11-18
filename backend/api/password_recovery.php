<?php
// POST {action:'request', channel:'email'|'number', contact:'...'}  -> creates a 6-digit code
// POST {action:'verify',  code:'123456'}                           -> checks the code
// POST {action:'reset',   new_password:'...'}                      -> sets the new password
// With 'recovery_dev_mode' => true in config.php the code is returned in the response (no email/SMS gateway).
require_once __DIR__ . '/../helpers.php';
require_method('POST');

const RECOVERY_CODE_MINUTES = 10;
const RECOVERY_MAX_TRIES    = 5;
const RECOVERY_MAX_REQUESTS = 5;

$b      = json_body();
$action = (string) ($b['action'] ?? '');
$dev    = (bool) app_setting('recovery_dev_mode', false);

function last10(string $s): string
{
    return substr(preg_replace('/\D/', '', $s), -10);
}

function mask_contact(string $channel, string $contact): string
{
    if ($channel === 'email') {
        [$name, $domain] = array_pad(explode('@', $contact, 2), 2, '');
        return mb_substr($name, 0, 2) . '***' . ($domain !== '' ? '@' . $domain : '');
    }
    $d = preg_replace('/\D/', '', $contact);
    return strlen($d) > 6 ? substr($d, 0, 4) . '***' . substr($d, -4) : '***';
}

// ---------------- step 1: send a code
if ($action === 'request') {
    $channel = (($b['channel'] ?? '') === 'number') ? 'number' : 'email';
    $contact = trim((string) ($b['contact'] ?? ''));

    if ($contact === '') {
        respond(['error' => $channel === 'email' ? 'Please enter your email address.' : 'Please enter your contact number.'], 400);
    }
    if ($channel === 'email' && !filter_var($contact, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Please enter a valid email address.'], 400);
    }
    if ($channel === 'number' && strlen(last10($contact)) < 10) {
        respond(['error' => 'Please enter a valid contact number (e.g. 09171234567).'], 400);
    }

    $_SESSION['recovery_requests'] = ($_SESSION['recovery_requests'] ?? 0) + 1;
    if ($_SESSION['recovery_requests'] > RECOVERY_MAX_REQUESTS) {
        respond(['error' => 'Too many code requests. Please try again later or contact an administrator.'], 429);
    }

    $user = null;
    if ($channel === 'email') {
        $s = db()->prepare('SELECT id, is_active FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $s->execute([$contact]);
        $user = $s->fetch() ?: null;
    } else {
        $s = db()->query('SELECT id, mobile_number, is_active FROM users WHERE mobile_number IS NOT NULL');
        foreach ($s->fetchAll() as $row) {
            if (last10($row['mobile_number']) === last10($contact)) { $user = $row; break; }
        }
    }

    $sentTo = mask_contact($channel, $contact);

    if (!$user || (isset($user['is_active']) && !$user['is_active'])) {
        unset($_SESSION['recovery']);
        if ($dev) {
            respond(['error' => !$user
                ? 'No account found with that ' . ($channel === 'email' ? 'email address.' : 'contact number.')
                : 'Account is disabled. Please contact an administrator.'], $user ? 403 : 404);
        }
        respond(['success' => true, 'channel' => $channel, 'sent_to' => $sentTo]);
    }

    $code = (string) random_int(100000, 999999);
    db()->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')->execute([$user['id']]);
    db()->prepare(
        'INSERT INTO password_resets (user_id, channel, code_hash, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ' . RECOVERY_CODE_MINUTES . ' MINUTE))'
    )->execute([$user['id'], $channel, password_hash($code, PASSWORD_DEFAULT)]);

    $_SESSION['recovery'] = ['reset_id' => (int) db()->lastInsertId(), 'user_id' => (int) $user['id'], 'verified' => false];

    $out = ['success' => true, 'channel' => $channel, 'sent_to' => $sentTo];
    if ($dev) $out['dev_code'] = $code;
    respond($out);
}

// ---------------- step 2: check the code
if ($action === 'verify') {
    $rec = $_SESSION['recovery'] ?? null;
    if (!$rec) respond(['error' => 'Please request a verification code first.'], 400);

    $code = preg_replace('/\D/', '', (string) ($b['code'] ?? ''));
    if (strlen($code) !== 6) respond(['error' => 'Enter the 6-digit verification code.'], 400);

    $s = db()->prepare(
        'SELECT id, code_hash, attempts FROM password_resets
         WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > NOW()'
    );
    $s->execute([$rec['reset_id'], $rec['user_id']]);
    $row = $s->fetch();
    if (!$row) respond(['error' => 'This code has expired. Please request a new one.'], 400);
    if ((int) $row['attempts'] >= RECOVERY_MAX_TRIES) {
        respond(['error' => 'Too many wrong attempts. Please request a new code.'], 429);
    }

    if (!password_verify($code, $row['code_hash'])) {
        db()->prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?')->execute([$row['id']]);
        $left = RECOVERY_MAX_TRIES - ((int) $row['attempts'] + 1);
        respond(['error' => $left > 0
            ? "Incorrect code. $left attempt" . ($left === 1 ? '' : 's') . ' left.'
            : 'Too many wrong attempts. Please request a new code.'], 400);
    }

    db()->prepare('UPDATE password_resets SET verified_at = NOW() WHERE id = ?')->execute([$row['id']]);
    $_SESSION['recovery']['verified'] = true;
    respond(['success' => true]);
}

// ---------------- step 3: set the new password
if ($action === 'reset') {
    $rec = $_SESSION['recovery'] ?? null;
    if (!$rec || empty($rec['verified'])) respond(['error' => 'Please verify your code first.'], 400);

    $newPass = (string) ($b['new_password'] ?? '');
    if (strlen($newPass) < 8) respond(['error' => 'New password must be at least 8 characters.'], 400);

    $s = db()->prepare(
        'SELECT id FROM password_resets
         WHERE id = ? AND user_id = ? AND used_at IS NULL AND verified_at IS NOT NULL AND expires_at > NOW()'
    );
    $s->execute([$rec['reset_id'], $rec['user_id']]);
    if (!$s->fetch()) respond(['error' => 'Your verification expired. Please start again.'], 400);

    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($newPass, PASSWORD_DEFAULT), $rec['user_id']]);
    db()->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?')->execute([$rec['reset_id']]);

    $u = db()->prepare('SELECT id, role FROM users WHERE id = ?');
    $u->execute([$rec['user_id']]);
    log_audit($u->fetch() ?: null, 'Password Reset', 'User', $rec['user_id'], 'Password reset using a verification code', ['type' => 'Auth']);

    unset($_SESSION['recovery']);
    $_SESSION['recovery_requests'] = 0;
    respond(['success' => true]);
}

respond(['error' => 'Unknown action'], 400);