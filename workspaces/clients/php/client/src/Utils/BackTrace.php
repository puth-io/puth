<?php

namespace Puth\Utils;

class BackTrace
{
    public static $debug = false;
    
    /**
     * @param $trace
     * @return array
     */
    public static function filter($trace): array
    {
        if (static::$debug) {
            return $trace;
        }
        
        return array_values(array_filter($trace, function ($frame) {
            if (array_key_exists('file', $frame)) {
                if (str_contains($frame['file'], 'vendor/phpunit/phpunit')) {
                    return false;
                }
                
                if (str_contains($frame['file'], 'puth-php/src')) {
                    return false;
                }
                
                if (str_contains($frame['file'], 'puth/php/src')) {
                    return false;
                }
            }
            
            return true;
        }));
    }

    public static function message($trace, $prefix = 'Puth Exception', int $maxLines = 7)
    {
        $message = "{$prefix} in {$trace[0]['file']} on line {$trace[0]['line']}\n\n[Puth StackTrace]\n";
    
        $truncate = $maxLines !== 0 && ! static::$debug;
        
        foreach ($trace as $idx => $frame) {
            // Don't show more than 5 frames
            if ($truncate && $idx === $maxLines) {
                $message .= '... (truncated)';
                break;
            }
            
            $file = $frame['file'] ?? false;
            
            $fileWithLine = $file ? sprintf(
                "%s(%s)",
                $frame['file'] ?? '?',
                $frame['line'] ?? '?',
            ) : '[internal function]';

            $message .= sprintf(
                "#{$idx} %s: %s%s%s()\n",
                $fileWithLine,
                $frame['class'] ?? '',
                $frame['type'] ?? '',
                $frame['function'] ?? '',
            );
        }

        return $message;
    }
    
    public static function enableDebug()
    {
        static::$debug = true;
    }
    
    public static function disableDebug()
    {
        static::$debug = false;
    }
}
