<?php

namespace Puth;

use PHPUnit\Framework\TestCase;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthDuskAssertions;
use Puth\Traits\PuthDuskInteractsWithCookies;
use Puth\Traits\PuthDuskUrlAssertions;
use Puth\Traits\PuthTestCaseTrait;

class PuthTestCase extends TestCase
{
    use PuthTestCaseTrait;
    use PuthAssertions;
    use PuthDuskAssertions;
    use PuthDuskUrlAssertions;
    use PuthDuskInteractsWithCookies;
}