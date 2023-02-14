<?php

namespace Tests\Browser;

use App\Models\User;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;
use function PHPUnit\Framework\assertEquals;

class AllMethodsTest extends PuthDuskTestCase
{
    function test_wip()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->puthPage->clickNoBlockDialog('#dialog-alert')
                
//                ->assertDisabled($browser->resolver->findOrFail('#actions-focus'))
//                ->assertButtonEnabled
//                ->assertButtonDisabled
            ;
    
            $browser->waitForDialog()
                ->acceptDialog();
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
                ->assertSelected('#actions-select', 'orange')
            ;
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
                ->assertUrlIs($next)
            ;
        });
    }
    
    function test_resize()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
    
            $browser->resize(300, 400);
            $viewport = $browser->puthPage->viewport();
    
            static::assertEquals([300, 400],[
                $viewport->width,
                $viewport->height,
            ]);
    
            $browser->resize(600, 800);
            $viewport = $browser->puthPage->viewport();
    
            static::assertEquals([600, 800],[
                $viewport->width,
                $viewport->height,
            ]);
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
                ->assertHasCookie('plain')
                ->addCookie('test', '5678')
                ->assertCookieValue('test', '5678')
                ->assertCookieMissing('not-a-cookie')
                ->assertSee('Welcome to Puth')
                ->assertDontSee('This text does not exists')
                ->assertSeeIn('body', 'Querying')
                ->assertDontSeeIn('body', 'This text does not exists')
                ->assertSeeAnythingIn('body')
                ->assertSourceHas('<title>Playground - Puth</title>')
                ->assertSourceMissing('<div>__not in dom__</div>')
                ->assertSeeLink('https://puth.dev/')
                ->assertDontSeeLink('https://notalink.io')
                ->assertVisible('body')
                ->assertVisible($browser->resolver->findOrFail('body'))
                ->assertInputValue('#properties-value input', 'input with value')
                ->assertInputValue($browser->resolver->findOrFail('#properties-value input'), 'input with value')
                ->assertInputValueIsNot('#properties-value input', 'not the correct value')
                ->assertInputValueIsNot($browser->resolver->findOrFail('#properties-value input'), 'not the correct value')
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
                ->assertAttribute('#actions-type input', 'type', 'text')
                ->assertDataAttribute('#properties-attributes', 'test', '1234')
                ->assertAriaAttribute('#properties-attributes', 'rowspan', '5678')
                ->assertPresent('body')
                ->assertMissing('missingelement')
//                ->assertDialogOpened // https://github.com/puppeteer/puppeteer/issues/9666
                ->assertEnabled($browser->resolver->findOrFail('#actions-focus'))
//                ->assertDisabled($browser->resolver->findOrFail('#actions-focus'))
//                ->assertButtonEnabled
//                ->assertButtonDisabled
                ->click('#actions-focus')
                ->assertFocused('#actions-focus')
                ->assertNotFocused('#actions-type input')
//                ->assertVue
//                ->assertVueIsNot
//                ->assertVueContains
//                ->assertVueDoesNotContain
//                ->vueAttribute
                ->assertScript('1+1', 2)
            ;
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
                ->assertQueryStringHas('param1', 'abc')
                ->assertQueryStringMissing('test')
                ->assertHasQueryStringParameter('param1')
            ;
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
            ;
        });
    
        $this->browse(function (Browser $browser) {
            $browser->puthPage->prefersReducedMotion();
            
            $browser->visit(new Playground)
                ->clickAndHold('#actions-click > button')
                ->releaseMouse()
                ->assertSeeIn('#actions-click', 'clicked button')
            ;
        });
    
        $this->browse(function (Browser $browser) {
            $browser->puthPage->prefersReducedMotion();
            
            $browser->visit(new Playground);
            
            $element = $browser->resolver->findOrFail('#actions-click > button');
            
            $element->scrollIntoView();
            
            $point = $element->clickablePoint();
            
            $browser->clickAtPoint($point->x, $point->y)
                ->assertSeeIn('#actions-click', 'clicked button');
        });
    }
    
    function test_concern_interacts_with_authentication()
    {
        $user = User::factory()->create();
    
        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')
                ->loginAs($user)
                ->assertAuthenticated()
                ->assertAuthenticatedAs($user)
                ->logout()
                ->assertGuest()
            ;
        });
    }
    
    function test_concern_interacts_with_javascript()
    {
        $this->browse(function (Browser $browser) {
            $response = $browser->visit(new Playground)
                ->script([
                    '1 + 1',
                    'window.document.location.href',
                ])
            ;
            
            assertEquals([2, (new Playground)->url()], $response);
        });
    }
    
    function test_concerns_interacts_with_elements_values()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->value('#actions-type', 'test-1234')
                ->assertValue('#actions-type', 'test-1234')
                ->assertAttribute('#actions-focus', 'type', 'text')
            ;
        
            static::assertEquals('test-1234', $browser->value('#actions-type'));
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
                ->assertValue('#actions-focus', '')
            ;
        });
    }
}
