<?php

namespace Browser;

use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class WaitUntilTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_wait_until()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
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
