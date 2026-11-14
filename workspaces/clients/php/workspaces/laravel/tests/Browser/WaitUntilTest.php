<?php

namespace Browser;

use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class WaitUntilTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_wait_until()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent(<<<'HTML'
<div id="wait-for-missing-text-container">
  <div id="wait-for-missing-text-item">click button to hide this element</div>
</div>
<button
  id="wait-for-missing-text-button"
  onclick="let c = document.querySelector('#wait-for-missing-text-container'); let item = c.children.item(0); let clone = item.cloneNode(true); item.remove(); setTimeout(() => c.appendChild(clone), 2000)"
>hide</button>
<div id="wait-for-present-text-container"></div>
<button
  id="wait-for-present-text-button"
  onclick="let c = document.querySelector('#wait-for-present-text-container'); c.innerHTML = '<div id=\'wait-for-present-text-item\'>clicked button to show this element</div>'; setTimeout(() => c.innerHTML = '', 2000)"
>show</button>
<button id="actions-click-disabled" disabled>disabled</button>
<button
  id="actions-click-wait"
  onclick="let a = document.querySelector('#actions-click-disabled'); this.disabled = true; a.disabled = false; setTimeout(() => { this.disabled = false; a.disabled = true; }, 2000)"
>click and wait</button>
HTML)
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissing('#wait-for-missing-text-item')
                ->waitFor('#wait-for-missing-text-item')
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissingText('click button to hide this element')
                ->waitForText('click button to hide this element')
                ->waitForText('CLICK BUTTON TO HIDE THIS ELEMENT', ignoreCase: true)
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissingText('click button to hide this element')
                ->waitForTextIn('#wait-for-missing-text-container', 'click button to hide this element')
                ->waitForTextIn('#wait-for-missing-text-container', 'CLICK BUTTON TO HIDE THIS ELEMENT', ignoreCase: true)
                ->click('#wait-for-present-text-button')
                ->waitFor('#wait-for-present-text-item')
                ->waitUntilMissing('#wait-for-present-text-item')
                ->click('#wait-for-present-text-button')
                ->waitForText('clicked button to show this element')
                ->waitUntilMissingText('clicked button to show this element')
                ->click('#actions-click-wait')
                ->waitUntilDisabled('#actions-click-wait')
                ->waitUntilEnabled('#actions-click-wait')
                ->click('#actions-click-wait')
                ->waitUntilEnabled('#actions-click-disabled')
                ->waitUntilDisabled('#actions-click-disabled')
            ;
        });
    }
}
