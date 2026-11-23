<?php
// Admin: upload an item photo. Saved in photo/AC_NC/ and the path is returned, to be sent as image_path
// to inventory.php (POST to add an item, PUT to change one).
//
// POST (multipart/form-data)  image = the file (png / jpg / webp / gif, max 2 MB)
//                             item_code? = used to name the file (e.g. NC-019.png); random name when omitted
// -> {success:true, image_path:'photo/AC_NC/NC-019.png'}
require_once __DIR__ . '/../helpers.php';
require_role('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Method not allowed'], 405);

$f = $_FILES['image'] ?? null;
if (!$f || $f['error'] !== UPLOAD_ERR_OK) {
    $msg = [UPLOAD_ERR_INI_SIZE => 'File is larger than the server allows', UPLOAD_ERR_FORM_SIZE => 'File is too large',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded'][$f['error'] ?? UPLOAD_ERR_NO_FILE] ?? 'Upload failed';
    respond(['error' => $msg], 400);
}
if ($f['size'] > 2 * 1024 * 1024) respond(['error' => 'Photo must be 2 MB or smaller'], 400);

// Check the real file type (not just the name the browser sent).
$info = @getimagesize($f['tmp_name']);
$ext  = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
if (!$ext) respond(['error' => 'Photo must be a PNG, JPG, WEBP or GIF image'], 400);

$base = preg_replace('/[^A-Za-z0-9-]/', '', (string) ($_POST['item_code'] ?? ''));
if ($base === '') $base = 'item-' . bin2hex(random_bytes(4));

$dir = dirname(__DIR__, 2) . '/photo/AC_NC';        // project root / photo / items
if (!is_dir($dir) && !mkdir($dir, 0755, true)) respond(['error' => 'Could not create the photo folder'], 500);

// Replacing a photo for the same item: remove the old file so no stale copy with another extension is left behind.
foreach (['png', 'jpg', 'webp', 'gif'] as $e) {
    if ($e !== $ext && is_file("$dir/$base.$e")) @unlink("$dir/$base.$e");
}
if (!move_uploaded_file($f['tmp_name'], "$dir/$base.$ext")) respond(['error' => 'Could not save the photo'], 500);

respond(['success' => true, 'image_path' => "photo/AC_NC/$base.$ext"]);
