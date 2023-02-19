<?php

namespace Puth\Assertions\Constraint;

use Puth\Assertions\Exporter\GenericElementExporter;
use Puth\Context;
use PHPUnit\Framework\Constraint\Constraint;
use PHPUnit\Framework\ExpectationFailedException;
use SebastianBergmann\Comparator\ComparisonFailure;
use SebastianBergmann\Exporter\Exporter;

class ElementEquals extends Constraint
{
    /**
     * @var mixed
     */
    private $value;

    /**
     * @var Context
     */
    private $context;

    public function __construct($value, $context)
    {
        $this->value = $value;
        $this->context = $context;
    }

    public function evaluate($other, string $description = '', bool $returnResult = false): ?bool
    {
        $assertion = $this->context->assertStrictEqual($this->value, $other);

        if ($assertion->result === false) {
            if ($returnResult) {
                return false;
            }

            throw new ExpectationFailedException(
                $description . "\n" . "Expected element [{$this->value}] to be [{$other}]",
                new ComparisonFailure($other, $this->value, strval($other), strval($this->value)),
            );
        }

        return true;
    }

    public function toString(): string
    {
        return sprintf(
            'is equal to %s',
            $this->value
        );
    }

    protected function exporter(): Exporter
    {
        return new GenericElementExporter;
    }
}