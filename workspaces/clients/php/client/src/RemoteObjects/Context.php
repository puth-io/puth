<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**
* codegen-entry
*/
class Context extends RemoteObject
{
    /**
     * codegen-entry
     * 
     * @debug-gen-original-name "createBrowserShim"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["Browser"]
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function createBrowserShim(mixed $options = []): Browser
    {
        return $this->callFunc('createBrowserShim', [$options]);
    }

    /**
     * codegen-entry
     * 
     * @debug-gen-original-name "createBrowserShimForPage"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["Browser"]
     * @debug-gen-original-parameter page {"type":"Page","isOptional":false}
     */
    public function createBrowserShimForPage(mixed $page): Browser
    {
        return $this->callFunc('createBrowserShimForPage', [$page]);
    }

    /**
     * codegen-entry
     * 
     * @debug-gen-original-name "testFailed"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     */
    public function testFailed(): void
    {
        $this->callFunc('testFailed');
    }

    /**
     * Used by clients to upload temporary files to the server so that the browser can access them
     * codegen-entry
     * 
     * @debug-gen-original-name "saveTemporaryFile"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["string"]
     * @debug-gen-original-parameter name {"type":"any","isOptional":false}
     * @debug-gen-original-parameter content {"type":"any","isOptional":false}
     */
    public function saveTemporaryFile(mixed $name, mixed $content): string
    {
        return $this->callFunc('saveTemporaryFile', [$name, $content]);
    }
}
