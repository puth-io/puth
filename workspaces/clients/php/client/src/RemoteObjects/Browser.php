<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

class Browser extends RemoteObject
{
    /**
     * @debug-ts-return-types void
     */
    public function pub_test(): void
    {
        $this->callMethod('pub_test');
    }
}
