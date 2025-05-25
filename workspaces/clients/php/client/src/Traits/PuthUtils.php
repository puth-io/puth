<?php

namespace Puth\Traits;

use Exception;

trait PuthUtils
{
    /**
     * Retries a $func for $timeout seconds with a $delay between each func call.
     *
     * @throws Exception
     */
    public function retryFunc($func, $timeout = null, $delay = 100)
    {
        if (!$timeout) {
            $timeout = $this->getPuthAssertionTimeout();
        }

        $start = microtime(true);

        while ((microtime(true) - $start) * 1000 < $timeout) {
            $time = microtime(true);

            try {
                return $func();
            } catch (Exception $e) {
            }

            $sleep = $delay - ((microtime(true) - $time) * 1000);

            if ($sleep > 0) {
                usleep($sleep * 1000);
            }
        }

        if ($e) {
            throw $e;
        }
    }

    private function getPuthAssertionTimeout()
    {
        if (method_exists($this, 'puthAssertionTimeout')) {
            $timeout = $this->puthAssertionTimeout();
        }

        return $timeout ??  15 * 1000;
    }
}
