<?php

namespace tests\Browser;

use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithMouseTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_mouse_control_click()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body><a href="https://playground.puth.dev" onclick="event.preventDefault(); document.querySelector(\'#result\').innerHTML = event.ctrlKey ? \'1\' : \'0\';">playground</a><div id="result"></div></body></html>');
            $browser->controlClick('a')
                ->assertSeeIn('#result', '1');
        });
    }

    function test_mouse_click_without_selector()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body><button onmouseup="let a = document.querySelector(\'#result\'); a.innerHTML = `${parseInt(a.innerText) + 1}`;">test</button><div id="result">0</div></body></html>');
            $browser->click('button')
                ->assertSeeIn('#result', '1')
                // assert virtual mouse stays in position
                ->clickAndHold()
                ->releaseMouse()
                ->assertSeeIn('#result', '3')
                ->doubleClick()
                ->assertSeeIn('#result', '5')
                ->rightClick()
                ->assertSeeIn('#result', '6');
        });
    }

    function test_mouse_click_at_point()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);

            $element = $browser->_firstOrFail('#actions-click > button');
            $element->scrollIntoView();
            $point = $element->clickablePoint();

            $browser->clickAtPoint($point->x, $point->y)
                ->assertSeeIn('#actions-click', 'clicked button');
        });
    }

    function test_mouse_click_exception()
    {
        $this->expectException(\PHPUnit\Framework\ExpectationFailedException::class);
        $this->browse(function (Browser $browser) {
            $browser->timeout = 250;
            $browser->timeoutMultiplier = 1;

            $browser->visit(new Playground)
                ->click('not-an-element');
        });
    }

    function test_concern_interacts_with_mouse()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->click('#actions-click > button')
                ->assertSeeIn('#actions-click-verify', 'clicked button')
                ->doubleClick('#actions-click-double')
                ->assertSeeIn('#actions-click-double-verify', 'double clicked button')
                ->rightClick('#actions-click-mousedown')
                ->assertSeeIn('#actions-click-mousedown-verify', 'mousedown: 3')
                ->mouseover('#actions-hover')
                ->assertSeeIn('#actions-hover', 'hovering');

            $browser->visit(new Playground)
                ->clickAtXPath('//*[@id="actions-click"]/*')
                ->assertSeeIn('#actions-click', 'clicked button');
            $this->expectException(\PHPUnit\Framework\ExpectationFailedException::class);
            $browser->clickAtXPath('//*[@id="non-existing-element-id"]');
        });
    }
}
