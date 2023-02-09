<?php

namespace Puth\Laravel\Traits;

use Puth\Laravel\BrowserProxy\BrowserProxy;

trait PuthDuskBrowser
{
    public function browse(\Closure $closure)
    {
        $closure(
            new BrowserProxy(
                $this->context->createBrowser([
                    'headless' => true,
                ]),
            ),
        );
    }
}