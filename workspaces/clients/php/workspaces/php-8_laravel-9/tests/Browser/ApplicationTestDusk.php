<?php

namespace Tests\Browser;

use Laravel\Dusk\Browser;
use Tests\Browser\Pages\Playground;
use Tests\DuskTestCase;

class ApplicationTestDusk extends DuskTestCase
{
    function test_dusk_browser_proxy()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->type('@input-type', 'test')
                ->type('@input-clear', 'password')
                ->press('h1')
                ->assertPathIs('/');
        });
    }
}
