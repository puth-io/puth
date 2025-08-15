<?php

namespace Browser;

use PHPUnit\Framework\ExpectationFailedException;
use Puth\Laravel\Browser;
use Tests\PuthTestCase;
use PHPUnit\Framework\Assert;

class MakesAssertionsTest extends PuthTestCase
{
    public static bool $testAfterClassDone;

    public static bool $debug = false;
    
    function test_assert_missing_exception()
    {
        $this->expectException(ExpectationFailedException::class);
        $this->browse(function (Browser $browser) {
            $browser->setContent('<body><div></div></body>');
            $browser->assertMissing('div');
        });
    }
    
    function test_stores_source_logs()
    {
        $fileName = Browser::$storeSourceAt . '/' . $this->getCallerName() . '-0.txt';
        $html = '<html><head></head><body><div></div></body></html>';
        
        if (file_exists($fileName)) {
            unlink($fileName); // remove old test file outputs
        }
        
        try {
            $this->browse(function (Browser $browser) use ($html) {
                $browser->setContent($html);
                $browser->assertSourceHas('div');
                $browser->assertMissing('div');
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
            $browser->setContent('<body><input name="test"></body>');
            $browser->assertInputMissing('wrongname', 1);
            $browser->assertInputPresent('test', 1);
        });
    }
    
    function test_assert_input_present_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(ExpectationFailedException::class);
            $browser->assertInputPresent('test', 1);
        });
    }
    
    function test_assert_input_missing_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(ExpectationFailedException::class);
            $browser->setContent('<body><input name="test"></body>');
            $browser->assertInputMissing('test', 1);
        });
    }
    
    function test_assert_input_intermediate()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<input type="checkbox"><script>document.querySelector("input").indeterminate = true</script>');
            $browser->assertIndeterminate('input');
        });
    }
    
    function test_assert_see()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<div id="a">test</div><div id="b"></div>');
            $browser->assertSeeAnythingIn('#a')
                ->assertSeeNothingIn('#b');
        });
    }
    
    function test_assert_vue()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/')
                ->waitForText('Count')
                ->assertVue('count', 0, '#counter')
                ->assertVueIsNot('count', 1, '#counter')
                ->assertVueDoesntContain('array', 1, '#counter')
                ->assertVueDoesNotContain('array', 1, '#counter')
                ->click('#add')
                ->assertVue('count', 1, '#counter')
                ->assertVueIsNot('count', 0, '#counter')
                ->assertVueContains('array', 1, '#counter')
                ->assertVueIsNot('count', '0', '#counter');

            Assert::assertEquals(1, $browser->vueAttribute('#counter', 'count'));
        });
    }
}
