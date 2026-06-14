<?php

$source = $argv[1] ?? '';
$dest = $argv[2] ?? preg_replace('/\.(jpe?g|webp)$/i', '.png', $source);

if ($source === '' || ! is_file($source)) {
    fwrite(STDERR, "Usage: php make-icon-transparent.php <source> [dest]\n");
    exit(1);
}

$extension = strtolower(pathinfo($source, PATHINFO_EXTENSION));

$img = match ($extension) {
    'png' => imagecreatefrompng($source),
    'jpg', 'jpeg' => imagecreatefromjpeg($source),
    'webp' => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($source) : false,
    default => false,
};

if ($img === false) {
    // Fall back when extension does not match file contents.
    $img = @imagecreatefrompng($source)
        ?: @imagecreatefromjpeg($source)
        ?: (function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false);
}

if ($img === false) {
    fwrite(STDERR, "Failed to load image.\n");
    exit(1);
}

$width = imagesx($img);
$height = imagesy($img);

imagesavealpha($img, true);
imagealphablending($img, false);

$transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
$visited = array_fill(0, $height, array_fill(0, $width, false));
$queue = [];

$isBackground = static function (GdImage $img, int $x, int $y): bool {
    $rgb = imagecolorat($img, $x, $y);
    $alpha = ($rgb & 0x7F000000) >> 24;
    if ($alpha >= 120) {
        return true;
    }

    $r = ($rgb >> 16) & 0xFF;
    $g = ($rgb >> 8) & 0xFF;
    $b = $rgb & 0xFF;

    return $r >= 235 && $g >= 235 && $b >= 235;
};

for ($x = 0; $x < $width; $x++) {
    foreach ([0, $height - 1] as $y) {
        if ($isBackground($img, $x, $y)) {
            $queue[] = [$x, $y];
        }
    }
}

for ($y = 0; $y < $height; $y++) {
    foreach ([0, $width - 1] as $x) {
        if ($isBackground($img, $x, $y)) {
            $queue[] = [$x, $y];
        }
    }
}

while ($queue !== []) {
    [$x, $y] = array_pop($queue);

    if ($x < 0 || $y < 0 || $x >= $width || $y >= $height || $visited[$y][$x]) {
        continue;
    }

    if (! $isBackground($img, $x, $y)) {
        continue;
    }

    $visited[$y][$x] = true;
    imagesetpixel($img, $x, $y, $transparent);

    $queue[] = [$x + 1, $y];
    $queue[] = [$x - 1, $y];
    $queue[] = [$x, $y + 1];
    $queue[] = [$x, $y - 1];
}

imagepng($img, $dest);
imagedestroy($img);

echo "Saved transparent PNG to {$dest}\n";
