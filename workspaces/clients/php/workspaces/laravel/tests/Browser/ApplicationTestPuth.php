<?php

namespace Tests\Browser;

use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class ApplicationTestPuth extends PuthDuskTestCase
{
    function test_dusk_browser_proxy_puth()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->type('@input-type', 'test')
//                ->screenshot('test2')
//                ->type('@input-clear', 'password')
//                ->press('h1')
//                    ->assertSourceHas('html');
                ->assertPathIs('/');
//                ->tinker();
        });
    }
}
