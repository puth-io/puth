<?php

namespace Puth\Traits;

use PHPUnit\Framework\Assert;
use Puth\Assertions\Constraint\ElementEquals;

trait PuthAssertions
{
    function assertElementEquals($element1, $element2)
    {
        Assert::assertThat($element1, new ElementEquals($element2, $this->context));
    }

    function assertElementNotEquals($element1, $element2)
    {
        Assert::assertThat($element1, Assert::logicalNot(
            new ElementEquals($element2, $this->context)
        ));
    }
}