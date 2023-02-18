<?php

namespace Puth;

use PHPUnit\Framework\TestCase;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthTestCaseTrait;

class PuthTestCase extends TestCase
{
    use PuthTestCaseTrait;
    use PuthAssertions;
}