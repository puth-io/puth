<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**
* @codegen
*/
class Context extends RemoteObject
{
    /**
     * @codegen
     * 
     * @debug-gen-original-name "createBrowserShim"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["Browser"]
     * @debug-gen-original-parameter options {"type":"object","isOptional":false,"initializer":{"type":"object","members":[]}}
     * @debug-gen-original-parameter shimOptions {"type":"object","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function createBrowserShim(mixed $options = [], mixed $shimOptions = []): Browser
    {
        return $this->callFunc('createBrowserShim', [$options, $shimOptions]);
    }

    /**
     * @codegen
     * @gen-returns any[]
     * 
     * @debug-gen-original-name "getSnapshotsByType"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["Return"]
     * @debug-gen-original-parameter type {"type":"any","isOptional":false}
     */
    public function getSnapshotsByType(mixed $type): array
    {
        return $this->callFunc('getSnapshotsByType', [$type]);
    }

    /**
     * @codegen
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
     * @codegen
     * 
     * @debug-gen-original-name "testSuccess"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     */
    public function testSuccess(): void
    {
        $this->callFunc('testSuccess');
    }

    /**
     * @codegen
     * 
     * @debug-gen-original-name "testSucceeded"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     */
    public function testSucceeded(): void
    {
        $this->callFunc('testSucceeded');
    }

    /**
     * Used by clients to upload temporary files to the server so that the browser can access them
     * @codegen
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
