<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

class Context extends RemoteObject
{
    /**
     * @debug-ts-return-types Browser
     */
    public function createBrowserShim(mixed $page, string $baseUrl): Browser
    {
        return $this->callMethod('createBrowserShim', [$page, $baseUrl]);
    }

    /**
     * @debug-ts-return-types void
     */
    public function testFailed(): void
    {
        $this->callMethod('testFailed');
    }

    /**
     * @debug-ts-return-types void
     */
    public function saveTemporaryFile(mixed $name, mixed $content): void
    {
        $this->callMethod('saveTemporaryFile', [$name, $content]);
    }
}
