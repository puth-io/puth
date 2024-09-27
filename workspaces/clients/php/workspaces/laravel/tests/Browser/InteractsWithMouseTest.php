<?php

namespace tests\Browser;

use Puth\Laravel\Browser\Browser;
use Tests\PuthTestCase;

class InteractsWithMouseTest extends PuthTestCase
{
    function test_mouse_control_click()
    {
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('<html><body><a href="https://playground.puth.dev" onclick="event.preventDefault(); document.querySelector(\'#result\').innerHTML = event.ctrlKey ? \'1\' : \'0\';">playground</a><div id="result"></div></body></html>');
            $browser->controlClick('a')
                ->assertSeeIn('#result', '1');
        });
    }
}
