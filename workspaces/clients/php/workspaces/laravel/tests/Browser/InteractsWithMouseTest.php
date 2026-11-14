<?php

namespace tests\Browser;

use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class InteractsWithMouseTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_mouse_control_click()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body><a href="'.config('puth.fixture').'" onclick="event.preventDefault(); document.querySelector(\'#result\').innerHTML = event.ctrlKey ? \'1\' : \'0\';">fixture</a><div id="result"></div></body></html>');
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
                ->assertSeeIn('#result', '2')
                ->doubleClick()
                ->assertSeeIn('#result', '4')
                ->rightClick()
                ->assertSeeIn('#result', '5');
        });
    }

    function test_mouse_click_at_point()
    {
        $this->browse(function (Browser $browser) {
            // The button is below the viewport, so it has to be scrolled into view first
            $browser->setContent(<<<'HTML'
<div style="height: 2000px"></div>
<div id="actions-click">
  <button onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button>
  <p id="verify"></p>
</div>
HTML);

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

            $browser->setContent('<button>an element</button>')
                ->click('not-an-element');
        });
    }

    function test_concern_interacts_with_mouse()
    {
        $this->browse(function (Browser $browser) {
            $page = <<<'HTML'
<div id="actions-click">
  <button onclick="document.querySelector('#actions-click-verify').innerText = 'clicked button'">click me</button>
  <p id="actions-click-verify"></p>
  <button id="actions-click-double" ondblclick="document.querySelector('#actions-click-double-verify').innerText = 'double clicked button'">double click</button>
  <p id="actions-click-double-verify"></p>
  <button id="actions-click-mousedown" onmousedown="document.querySelector('#actions-click-mousedown-verify').innerText = 'mousedown: ' + event.which">mousedown event</button>
  <p id="actions-click-mousedown-verify"></p>
</div>
<div id="actions-hover" style="height: 2rem" onmouseover="this.innerText = 'hovering'" onmouseleave="this.innerText = ''"></div>
HTML;

            $browser->setContent($page)
                ->click('#actions-click > button')
                ->assertSeeIn('#actions-click-verify', 'clicked button')
                ->doubleClick('#actions-click-double')
                ->assertSeeIn('#actions-click-double-verify', 'double clicked button')
                ->rightClick('#actions-click-mousedown')
                ->assertSeeIn('#actions-click-mousedown-verify', 'mousedown: 3')
                ->mouseover('#actions-hover')
                ->assertSeeIn('#actions-hover', 'hovering');

            $browser->setContent($page)
                ->clickAtXPath('//*[@id="actions-click"]/*')
                ->assertSeeIn('#actions-click', 'clicked button');
            
            $browser->timeout = 50;
            $browser->timeoutMultiplier = 1;
            $this->expectException(\PHPUnit\Framework\ExpectationFailedException::class);
            $browser->clickAtXPath('//*[@id="non-existing-element-id"]');
        });
    }

    function test_click_at_parenthesised_xpath()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<button onclick="document.title = \'first\'">Go</button><button onclick="document.title = \'last\'">Go</button>')
                ->clickAtXPath("(//button[normalize-space(.)='Go'])[last()]")
                ->waitUntil("document.title === 'last'", 3);
        });
    }
}
