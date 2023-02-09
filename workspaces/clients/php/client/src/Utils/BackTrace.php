<?php

namespace Puth\Utils;

class BackTrace
{
    /**
     * @param $trace
     * @return array
     */
    public static function filter($trace): array
    {
        return array_values(array_filter($trace, function ($frame) {
            return ! (str_contains($frame['file'], 'puth-php/src') || str_contains($frame['file'], 'puth/php/src'));
        }));
    }

    public static function message($trace, $prefix = 'Puth Exception')
    {
        $message = "{$prefix} in {$trace[0]['file']} on line {$trace[0]['line']}\n\n[Puth StackTrace]\n";

        foreach ($trace as $idx => $frame) {
            // Don't show more than 5 frames
            if ($idx === 5) {
                $message .= '... (truncated)';
                break;
            }

            $message .= sprintf(
                "#{$idx} %s:%s\n",
                $frame['file'],
                $frame['line'] ?? '?',
            );
        }

        return $message;
    }
}