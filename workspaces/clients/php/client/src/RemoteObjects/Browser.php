<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

class Browser extends RemoteObject
{
    /**
     * @debug-ts-return-types this
     */
    public function visit(string $url): Browser
    {
        return $this->call('visit', [$url]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function blank(): Browser
    {
        return $this->call('blank');
    }

    /**
     * @debug-ts-return-types this
     */
    public function refresh(mixed $options = ['timeout' => 15]): Browser
    {
        return $this->call('refresh', [$options]);
    }
}
