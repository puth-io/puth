<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Illuminate\Support\Carbon;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class AllMethodsTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_querying_elements()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            Assert::assertCount(2, $browser->elements('.querying-get'));
            Assert::assertCount(1, $browser->elements('#querying-get'));
        });
    }
    
    function test_press()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->press('click me')
                ->assertSeeIn('#actions-click-verify', 'clicked button')
                ->pressAndWaitFor('click and wait')
                ->assertButtonEnabled('click and wait');
        });
    }
    
    function test_select()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->select('#actions-select-multiple', ['apple', 'orange'])
                ->assertSelected('#actions-select-multiple', ['apple', 'orange'])
                ->select('#actions-select-multiple', 'orange')
                ->assertSelected('#actions-select-multiple', 'orange')
                ->assertSelected('#actions-select', '')
                ->select('#actions-select', 'orange')
                ->assertSelected('#actions-select', 'orange');
            
            $browser->visit(new Playground)
                ->select('#actions-select-multiple');
            Assert::assertNotEmpty($browser->element('#actions-select-multiple')->value);
        });
    }
    
    function test_navigation()
    {
        $this->browse(function (Browser $browser) {
            $next = 'https://puth.io/';
            $playground = 'https://playground.puth.dev/';
            
            $browser->visit($playground)
                ->assertUrlIs($playground)
                ->visit($next)
                ->assertUrlIs($next)
                ->back()
                ->assertUrlIs($playground)
                ->forward()
                ->assertUrlIs($next)
                ->refresh()
                ->assertUrlIs($next);
        });
    }
    
    function test_resize()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            $browser->resize(300, 400);
            $viewport = $browser->viewport();
            
            static::assertEquals([300, 400], [
                $viewport->width,
                $viewport->height,
            ]);
            
            $browser->resize(600, 800);
            $viewport = $browser->viewport();
            
            static::assertEquals([600, 800], [
                $viewport->width,
                $viewport->height,
            ]);
        });
    }
    
    function test_interacts_with_cookies()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->cookie('encrypted', '1234', Carbon::tomorrow())
                ->assertCookieValue('encrypted', '1234');
        });
    }

    function test_concern_makes_assertions()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->assertTitle('Playground | Puth')
                ->assertTitleContains('Playground')
                ->assertPlainCookieValue('non-existing', '')
                ->plainCookie('plain', '1234')
                ->assertCookieValue('plain', '1234', false)
                ->assertHasPlainCookie('plain')
                ->assertPlainCookieValue('plain', '1234')
                ->deleteCookie('plain')
                ->assertPlainCookieMissing('plain')
                ->addCookie('test', '5678')
                ->assertHasCookie('test')
                ->assertCookieValue('test', '5678')
                ->deleteCookie('test')
                ->assertCookieMissing('test')
                ->assertSee('playground')
                ->assertSeeIn('.querying-get', 'Div')
                ->assertSeeIn('.example', 'Div')
                ->assertDontSee('This text does not exists')
                ->assertDontSeeIn('.querying-get', 'This text does not exists')
                ->assertScript('1+1', 2)
                ->assertSourceHas('<title>Playground | Puth</title>')
                ->assertSourceMissing('<div>__not in dom__</div>')
                ->assertSeeLink('https://puth.io/')
                ->assertDontSeeLink('https://notalink.io')
                ->assertVisible('.navbar')
                ->assertPresent('.navbar')
                ->assertNotPresent('#not-existing-element')
                ->assertMissing('missingelement')
                ->assertInputValue('#properties-value input', 'input with value')
                ->assertInputValueIsNot('#properties-value input', 'not the correct value')
                ->check('#action-checkbox')
                ->assertChecked('#action-checkbox')
                ->uncheck('#action-checkbox', 'test-1234')
                ->assertNotChecked('#action-checkbox')
                ->radio('action-radio', 'orange')
                ->assertRadioSelected('action-radio', 'orange')
                ->assertRadioNotSelected('action-radio', 'apple')
                ->select('#actions-select-multiple', ['apple', 'orange'])
                ->assertSelected('#actions-select-multiple', ['apple', 'orange'])
                ->assertNotSelected('#actions-select-multiple', 'not-selected')
                ->assertSelectHasOptions('#actions-select-multiple', ['apple', 'orange'])
                ->assertSelectMissingOptions('#actions-select-multiple', ['not-an-options'])
                ->assertSelectHasOption('#actions-select-multiple', 'orange')
                ->assertSelectMissingOption('#actions-select-multiple', 'not-an-options')
                ->type('#actions-type input', 'test-1234')
                ->assertValue('#actions-type input', 'test-1234')
                ->append('#actions-type input', '-')
                ->assertValueIsNot('#actions-type input', 'test-1234')
                ->assertAttribute('#actions-type input', 'type', 'text')
                ->assertDataAttribute('#properties-attributes', 'test', '1234')
                ->assertAriaAttribute('#properties-attributes', 'rowspan', '5678')
                ->assertEnabled('#actions-focus')
                ->assertDisabled('#actions-click-disabled')
                ->assertButtonDisabled('#actions-click-disabled')
                ->assertButtonEnabled('#actions-click-double')
                ->assertButtonEnabled('double click')
                ->click('#actions-focus')
                ->assertFocused('#actions-focus')
                ->assertNotFocused('#actions-type input')
            ;
        });
    }

    // TODO implement missing inverse tests
    function test_concern_makes_assertions_inverse()
    {
        $this->browse(function (Browser $browser) {
            $inverse = function (string $message, \Closure $closure) {
                try {
                    $closure();
                    $this->fail('Closure didn\'t throw any exception');
                } catch (\PHPUnit\Framework\ExpectationFailedException $e) {
                    if (!str_contains($e->getMessage(), $message)) {
                        throw new \PHPUnit\Framework\ExpectationFailedException("Failed asserting that '{$e->getMessage()}' contains '{$message}'");
                    }
                }
            };

            $browser->visit(new Playground);
            $browser->timeout = 500;
            $browser->functionTimeoutMultiplier = 1;

            $inverse('Did not see expected text [This text does not exists] within element [.querying-get]', fn() => $browser->assertSeeIn('.querying-get', 'This text does not exists'));
            $inverse('Saw unexpected text [Div] within element [.querying-get]', fn() => $browser->assertDontSeeIn('.querying-get', 'Div'));
            $inverse('JavaScript expression [1+1] mismatched', fn() => $browser->assertScript('1+1', 3));
            $inverse('Did not find expected source code [<div>__not in dom__</div>]', fn() => $browser->assertSourceHas('<div>__not in dom__</div>'));
            $inverse('Found unexpected source code [<title>Playground | Puth</title>]', fn() => $browser->assertSourceMissing('<title>Playground | Puth</title>'));

            $inverse("Waited 500ms for selector [body a[href='https://notalink.io/']]", fn() => $browser->assertSeeLink('https://notalink.io/'));
            $inverse('Waited 500ms for selector [body body #not-existing-element]', fn() => $browser->assertVisible('body #not-existing-element'));
        });
    }

    function test_assert_see_anything_exception()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            $this->expectException('PHPUnit\Framework\ExpectationFailedException');
            $browser->assertSeeAnythingIn('#querying-empty-div');
        });
    }
    
    function test_concern_makes_url_assertions()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev/first/second?param1=abc#starts-1234')
                ->assertUrlIs('https://playground.puth.dev/first/second?param1=abc#starts-1234')
                ->assertSchemeIs('https')
                ->assertSchemeIsNot('http')
                ->assertHostIs('playground.puth.dev')
                ->assertHostIsNot('not.the.host')
                ->assertPortIs(443)
                ->assertPortIsNot(12345)
                ->assertPathIs('/first/second')
                ->assertPathBeginsWith('/first')
                ->assertPathEndsWith('/second')
                ->assertPathContains('st/se')
                ->assertPathIsNot('/not-path')
                ->assertFragmentIs('starts-1234')
                ->assertFragmentBeginsWith('starts')
                ->assertFragmentIsNot('test-not')
                ->assertQueryStringHas('param1')
                ->assertQueryStringHas('param1', 'abc')
                ->assertQueryStringMissing('test');
        });
    }

    function test_wip()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev/first/second?param1=abc#starts-1234')
                ->evaluate('setTimeout(_ => window.location.href = "https://puth.io", 250)');
            $browser->assertUrlIs('https://puth.io/');
        });
    }

    function test_concerns_interacts_with_elements_values()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->value('#actions-type input', 'test-1234')
                ->assertValue('#actions-type input', 'test-1234')
                ->assertAttribute('#actions-focus', 'type', 'text')
                ->assertAttributeMissing('#actions-focus', 'missing-attribute')
                ->assertAttributeContains('#actions-focus', 'type', 'xt')
                ->assertAttributeDoesntContain('#actions-focus', 'type', 'wrong-value');
            
            static::assertEquals('test-1234', $browser->value('#actions-type input'));
            static::assertEquals('Div with id querying-get', $browser->text('#querying-get'));
            static::assertEquals('text', $browser->attribute('#actions-focus', 'type'));

            $browser->type('#actions-focus', '12')
                ->assertValue('#actions-focus', '12')
                ->type('#actions-focus', '34')
                ->assertValue('#actions-focus', '34')
                ->typeSlowly('#actions-focus', '56')
                ->assertValue('#actions-focus', '56')
                ->append('#actions-focus', '78')
                ->assertValue('#actions-focus', '5678')
                ->appendSlowly('#actions-focus', '90')
                ->assertValue('#actions-focus', '567890')
                ->clear('#actions-focus')
                ->assertValue('#actions-focus', '');
        });
    }
}
