<?php

namespace Tests\Unit;

use Exception;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class BrowserTest extends PuthDuskTestCase
{
    function test_multiple_browsers()
    {
        $this->browse(function (Browser $browser1, Browser $browser2) {
            Assert::assertIsObject($browser1);
            Assert::assertIsObject($browser2);
            Assert::assertNotEquals($browser1, $browser2);
        });        
    }
    
    function test_can_capture_failures()
    {
        $this->expectException(Exception::class);
        
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            throw new Exception();
        });
        
        // TODO validate screenshot exists
    }
}