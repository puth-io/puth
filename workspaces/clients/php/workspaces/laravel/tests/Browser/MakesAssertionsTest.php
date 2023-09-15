<?php

namespace Browser;

use PHPUnit\Framework\ExpectationFailedException;
use Puth\Laravel\Browser\Browser;
use Tests\PuthTestCase;
use PHPUnit\Framework\Assert;

class MakesAssertionsTest extends PuthTestCase
{
    public static bool $testAfterClassDone;
    
    function test_move_mouse_exception()
    {
        $this->expectException(ExpectationFailedException::class);
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('<body></body>');
            $browser->assertMissing('body', 0);
        });
    }
    
    function test_assert_port_is()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('http://example.com/')
                ->assertPortIs(80);
        });
    }
    
    function test_stores_source_logs()
    {
        $fileName = Browser::$storeSourceAt . '/' . $this->getCallerName() . '-0.txt';
        $html = '<html><head></head><body></body></html>';
        
        if (file_exists($fileName)) {
            unlink($fileName); // remove old test file outputs
        }
        
        try {
            $this->browse(function (Browser $browser) use ($html) {
                $browser->site->setContent($html);
                $browser->assertSourceHas('body');
                $browser->assertMissing('body', 0);
            });
        } catch (\Exception) {
        }
        
        Assert::assertEquals(
            $html,
            file_get_contents($fileName)
        );
    }
    
    function test_browser_after_class()
    {
        static::afterClass(function() {
            MakesAssertionsTest::$testAfterClassDone = true;
        });
        $this->tearDown();
        
        Assert::assertTrue(MakesAssertionsTest::$testAfterClassDone);
    }
    
    function test_assert_inputs()
    {
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('<body><input name="test"></body>');
            $browser->assertInputMissing('wrongname', 0);
            $browser->assertInputPresent('test', 0);
        });
    }
    
    function test_assert_input_present_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(ExpectationFailedException::class);
            $browser->assertInputPresent('test', 0);
        });
    }
    
    function test_assert_input_missing_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(ExpectationFailedException::class);
            $browser->site->setContent('<body><input name="test"></body>');
            $browser->assertInputMissing('test', 0);
        });
    }
    
    function test_assert_input_intermediate()
    {
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('<input type="checkbox"><script>document.querySelector("input").indeterminate = true</script>');
            $browser->assertIndeterminate('input');
        });
    }
    
    function test_assert_see()
    {
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('<div id="a">test</div><div id="b"></div>');
            $browser->assertSeeAnythingIn('#a')
                ->assertSeeNothingIn('#b');
        });
    }
}
