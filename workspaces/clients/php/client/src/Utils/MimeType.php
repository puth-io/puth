<?php

namespace Puth\Utils;

use League\MimeTypeDetection\ExtensionMimeTypeDetector;
use League\MimeTypeDetection\FinfoMimeTypeDetector;

class MimeType {
    private static ?FinfoMimeTypeDetector $detector = null;

    private static ?ExtensionMimeTypeDetector $extensionDetector = null;

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

    /**
     * Detects the type of a static file from its extension first. Sniffing alone mistakes minified JavaScript for
     * other types like text/x-java, and browsers refuse to run module scripts with them.
     */
    static function ofFile(string $path, string $content): ?string
    {
        $detector = static::detector();
        static::$extensionDetector ??= new ExtensionMimeTypeDetector();

        return static::$extensionDetector->detectMimeTypeFromPath($path)
            ?? $detector->detectMimeType($path, $content);
    }
}
