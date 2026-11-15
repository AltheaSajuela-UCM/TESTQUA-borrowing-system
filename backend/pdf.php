<?php
// Tiny dependency-free PDF writer: a titled, paginated, landscape A4 table.
// (Plain text in Helvetica; no Composer/FPDF needed on XAMPP.)
function simple_pdf(string $title, array $headers, array $rows): string
{
    $W = 842; $H = 595; $M = 36; $lineH = 14; $fs = 8;
    $cols = max(1, count($headers));
    $colW = ($W - 2 * $M) / $cols;
    $maxCh = max(4, (int) floor($colW / 4.6));

    $clean = function ($s) use ($maxCh) {
        $s = (string) $s;
        if (function_exists('iconv')) {
            $t = @iconv('UTF-8', 'windows-1252//TRANSLIT//IGNORE', $s);
            if ($t !== false) $s = $t;
        }
        $s = preg_replace('/[\x00-\x1F]/', ' ', $s);
        if (strlen($s) > $maxCh) $s = substr($s, 0, $maxCh - 1) . '.';
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    };

    $perPage = max(1, (int) floor(($H - 2 * $M - 50) / $lineH));
    $chunks  = array_chunk($rows, $perPage) ?: [[]];
    $stamp   = date('Y-m-d H:i');

    $objs = [
        1 => '<< /Type /Catalog /Pages 2 0 R >>',
        3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];
    $kids = [];
    foreach ($chunks as $n => $chunk) {
        $pageNo = 5 + 2 * $n;
        $cs = "BT /F2 13 Tf $M " . ($H - $M) . " Td (" . $clean($title) . ") Tj ET\n";
        $cs .= "BT /F1 8 Tf $M " . ($H - $M - 14) . " Td (Generated $stamp - Page " . ($n + 1) . ' of ' . count($chunks) . ") Tj ET\n";
        $y = $H - $M - 40;
        foreach ([$headers, ...$chunk] as $ri => $row) {
            $font = $ri === 0 ? 'F2' : 'F1';
            $row = array_values($row);
            for ($c = 0; $c < $cols; $c++) {
                $x = $M + $c * $colW;
                $cs .= "BT /$font $fs Tf $x $y Td (" . $clean($row[$c] ?? '') . ") Tj ET\n";
            }
            $y -= $lineH;
            if ($ri === 0) {
                $cs .= "$M " . ($y + $lineH - 3) . " m " . ($W - $M) . ' ' . ($y + $lineH - 3) . " l S\n";
            }
        }
        $objs[$pageNo]     = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 $W $H] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " . ($pageNo + 1) . ' 0 R >>';
        $objs[$pageNo + 1] = '<< /Length ' . strlen($cs) . " >>\nstream\n" . $cs . 'endstream';
        $kids[] = $pageNo . ' 0 R';
    }
    $objs[2] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . count($kids) . ' >>';
    ksort($objs);

    $pdf = "%PDF-1.4\n";
    $offsets = [];
    foreach ($objs as $num => $body) {
        $offsets[$num] = strlen($pdf);
        $pdf .= "$num 0 obj\n$body\nendobj\n";
    }
    $max = max(array_keys($objs));
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . ($max + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= $max; $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    $pdf .= "trailer\n<< /Size " . ($max + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    return $pdf;
}
