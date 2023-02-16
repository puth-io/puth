<?php

namespace Tests\Unit;

use PHPUnit\Framework\Assert;
use Puth\Laravel\PuthDuskTestCase;

class BrowserTest extends PuthDuskTestCase
{
    function test_multiple_browsers()
    {
        $this->browse(function ($browser1, $browser2) {
            Assert::assertIsObject($browser1);
            Assert::assertIsObject($browser2);
            Assert::assertNotEquals($browser1, $browser2);
        });        
    }
}