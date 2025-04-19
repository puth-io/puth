<?php

namespace Puth\Generics\Puth;

use Puth\GenericObject;

class Browser extends GenericObject
{
    /**
     * @debug-ts-return-types void
     */
    public function pub_test(): void
    {
        $this->callMethod('pub_test');
    }
}
