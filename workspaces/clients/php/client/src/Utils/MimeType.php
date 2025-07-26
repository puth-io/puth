<?php

namespace Puth\Utils;

use League\MimeTypeDetection\FinfoMimeTypeDetector;

class MimeType {
    private static ?FinfoMimeTypeDetector $detector = null;

    static function detector(): FinfoMimeTypeDetector
    {
        if (!class_exists('\\League\\MimeTypeDetection\\FinfoMimeTypeDetector')) {
            throw new \RuntimeException('Puth portal requires the league/mime-type-detection to support file requests.');
        }
        if (static::$detector == null) {
            static::$detector = new FinfoMimeTypeDetector();
        }

        return static::$detector;
    }
}
