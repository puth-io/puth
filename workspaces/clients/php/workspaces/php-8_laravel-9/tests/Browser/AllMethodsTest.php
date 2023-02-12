<?php

namespace Tests\Browser;

use App\Models\User;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class AllMethodsTest extends PuthDuskTestCase
{
    function test_wip()
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
    
    /**
     * DONE
     */
    
    function test_navigation()
    {
        $this->browse(function (Browser $browser) {
            $next = 'https://puth.dev/';
            
            $browser->visit(new Playground)
                ->assertUrlIs('https://playground.puth.dev/')
                ->visit($next)
                ->assertUrlIs($next)
                ->back()
                ->assertUrlIs('https://playground.puth.dev/')
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
                ->assertTitle('Puth - Playground')
                ->assertTitleContains('Playground')
                ->assertSee('Welcome to Puths Playground')
                ->assertDontSee('This text does not exists')
                ->assertSeeIn('body', 'Querying')
                ->assertDontSeeIn('body', 'This text does not exists')
                ->assertSourceHas('<title>Puth - Playground</title>')
                ->assertSourceMissing('<div>__not in dom__</div>')
                ->assertSeeLink('https://puth.dev')
                ->assertDontSeeLink('https://notalink.io')
                ->assertVisible('body')
                ->assertVisible($browser->puthPage->get('body'))
                ->assertInputValue($browser->puthPage->get('#properties-value input'), 'input with value')
                ->assertInputValueIsNot($browser->puthPage->get('#properties-value input'), 'not the correct value')
                ->assertPresent('body')
                ->assertMissing('missingelement')
                ->assertEnabled($browser->puthPage->get('#actions-focus'))
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
            
            $element = $browser->puthPage->get('#actions-click > button');
            
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
}
