<?php

namespace Tests\Browser;

use Exception;
use PHPUnit\Framework\Assert;
use Illuminate\Support\Carbon;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class AllMethodsTest extends PuthDuskTestCase
{
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
                ->press('#actions-click-button')
                ->assertSeeIn('#actions-click-verify', 'clicked button')
                ->pressAndWaitFor('#actions-click-wait');
        });
    }
    
    /**
     * DONE
     */
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
            $next = 'https://puth.dev/';
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
            $viewport = $browser->puthPage->viewport();
            
            static::assertEquals([300, 400], [
                $viewport->width,
                $viewport->height,
            ]);
            
            $browser->resize(600, 800);
            $viewport = $browser->puthPage->viewport();
            
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
                ->assertTitle('Playground - Puth')
                ->assertTitleContains('Playground')
                ->plainCookie('plain', '1234')
                ->assertCookieValue('plain', '1234', false)
                ->assertHasPlainCookie('plain')
                ->assertPlainCookieValue('plain', '1234')
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
                ->assertSeeAnythingIn('.querying-get')
                ->assertSourceHas('<title>Playground - Puth</title>')
                ->assertSourceMissing('<div>__not in dom__</div>')
                ->assertSeeLink('https://puth.dev/')
                ->assertDontSeeLink('https://notalink.io')
                ->assertVisible('body')
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
                ->assertSelectMissingOptions('#actions-select-multiple', 'not-an-options')
                ->assertSelectHasOption('#actions-select-multiple', 'orange')
                ->assertSelectMissingOption('#actions-select-multiple', 'not-an-options')
                ->type('#actions-type input', 'test-1234')
                ->assertValue('#actions-type input', 'test-1234')
                ->append('#actions-type input', '-')
                ->assertValueIsNot('#actions-type input', 'test-1234')
                ->assertAttribute('#actions-type input', 'type', 'text')
                ->assertDataAttribute('#properties-attributes', 'test', '1234')
                ->assertAriaAttribute('#properties-attributes', 'rowspan', '5678')
                ->assertPresent('body')
                ->assertNotPresent('body #not-existing-element')
                ->assertMissing('missingelement')
                ->assertEnabled('#actions-focus')
                ->assertDisabled('#actions-click-disabled')
                ->assertButtonDisabled('#actions-click-disabled')
                ->assertButtonEnabled('#actions-click-double')
                ->click('#actions-focus')
                ->assertFocused('#actions-focus')
                ->assertNotFocused('#actions-type input')
//                ->assertVue
//                ->assertVueIsNot
//                ->assertVueContains
//                ->assertVueDoesNotContain
//                ->vueAttribute
                ->assertScript('1+1', 2);
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
                ->assertUrlIs('https://playground.puth.dev/first/second')
                ->assertSchemeIs('https')
                ->assertSchemeIsNot('http')
                ->assertHostIs('playground.puth.dev')
                ->assertHostIsNot('not.the.host')
                ->assertPortIs(443)
                ->assertPortIsNot(12345)
                ->assertPathIs('/first/second')
                ->assertPathBeginsWith('/first')
                ->assertPathIsNot('/not-path')
                ->assertFragmentIs('starts-1234')
                ->assertFragmentBeginsWith('starts')
                ->assertFragmentIsNot('test-not')
                ->assertQueryStringHas('param1')
                ->assertQueryStringHas('param1', 'abc')
                ->assertQueryStringMissing('test')
                ->assertHasQueryStringParameter('param1');
            
            $browser->visit('/sub/path')
                ->assertRouteIs('sub.path')
                ->assertQueryStringMissing('no-query');
        });
    }
    
    function test_concern_interacts_with_mouse()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->click('#actions-click > button')
                ->assertSeeIn('#actions-click', 'clicked button')
                ->doubleClick('#actions-click-double')
                ->assertSeeIn('#actions-click', 'double clicked button')
                ->rightClick('#actions-click-mousedown')
                ->assertSeeIn('#actions-click', 'mousedown: 3')
                ->mouseover('#actions-hover')
                ->assertSeeIn('#actions-hover', 'hovering');
            
            $browser->visit(new Playground)
                ->clickAndHold('#actions-click > button')
                ->releaseMouse()
                ->assertSeeIn('#actions-click', 'clicked button');
            
            $browser->visit(new Playground)
                ->clickAtXPath('//*[@id="actions-click"]/*')
                ->assertSeeIn('#actions-click', 'clicked button');
            $this->expectException('Exception');
            $browser->clickAtXPath('//*[@id="non-existing-element-id"]');
        });
    }
    
    function test_mouse_click_at_point()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            $element = $browser->resolver->findOrFail('#actions-click > button');
            
            $element->scrollIntoView();
            $point = $element->clickablePoint();
            
            $browser->clickAtPoint($point->x, $point->y)
                ->assertSeeIn('#actions-click', 'clicked button');
        });
    }
    
    function test_mouse_click_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(Exception::class);
            
            $browser->visit(new Playground)
                ->click('not-an-element');
        });
    }
    
    function test_concerns_interacts_with_elements_values()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->value('#actions-type input', 'test-1234')
                ->assertValue('#actions-type input', 'test-1234')
                ->assertAttribute('#actions-focus', 'type', 'text')
                ->assertAttributeContains('#actions-focus', 'type', 'xt');
            
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
