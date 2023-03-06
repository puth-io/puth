<?php

namespace Puth\Exceptions;

use Exception;
use Throwable;

class UnreachableActionException extends Exception
{
    public function __construct(string $message = "Chained method calls are unreachable.", int $code = 0, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}