<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**
* Test comment
*/
class Context extends RemoteObject
{
    /**
     * @debug-ts-return-types Browser
     */
    public function createBrowserShim(mixed $options = []): Browser
    {
        return $this->call('createBrowserShim', [$options]);
    }

    /**
     * @debug-ts-return-types Browser
     */
    public function createBrowserShimForPage(mixed $page): Browser
    {
        return $this->call('createBrowserShimForPage', [$page]);
    }

    /**
     * @debug-ts-return-types void
     */
    public function testFailed(): void
    {
        $this->call('testFailed');
    }

    /**
     * Used by clients to upload temporary files to the server so that the browser can access them
     *
     * @debug-ts-return-types void
     */
    public function saveTemporaryFile(mixed $name, mixed $content): void
    {
        $this->call('saveTemporaryFile', [$name, $content]);
    }
}
