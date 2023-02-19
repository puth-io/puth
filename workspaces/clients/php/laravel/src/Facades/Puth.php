<?php

namespace Puth\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array getFormattedLog()
 * @method static void clearLog()
 * @method static void captureLog()
 * @method static void releaseLog()
 * @method static string instanceUrl()
 *
 * @see \Puth\Laravel\PuthManager
 */
class Puth extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor()
    {
        return 'puth';
    }
}