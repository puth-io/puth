<?php

namespace Puth\Utils;

use Puth\Exceptions\UnreachableActionException;

class DontProxy
{
    /**
     * @throws UnreachableActionException
     */
    public function __call(string $name, array $arguments)
    {
        throw new UnreachableActionException();
    }
    
    /**
     * @throws UnreachableActionException
     */
    public function __get(string $name)
    {
        throw new UnreachableActionException();
    }
}