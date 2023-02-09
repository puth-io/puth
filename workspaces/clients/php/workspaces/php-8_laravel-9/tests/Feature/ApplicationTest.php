<?php

namespace Tests\Feature;

use Puth\Laravel\BrowserProxy\BrowserProxy;
use Puth\Laravel\PuthDuskTestCase;

class ApplicationTest extends PuthDuskTestCase
{
    function test_dusk_browser_proxy()
    {
        $this->browse(function (BrowserProxy $browser) {
            $browser->visit('https://playground.puth.dev/')
                ->type('#actions-focus', 'test')
                ->type('#actions-clear', 'password')
                ->press('#actions-click button')
                ->assertPathIs('/');
        });
    }
}
