<?php

namespace Puth\Generics\Puth;

use Puth\GenericObject;

class Context extends GenericObject
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
    public function destroy(mixed $options): void
    {
        $this->callMethod('destroy', [$options]);
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
