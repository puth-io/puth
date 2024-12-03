<?php

namespace Tests\Browser;

use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class ExampleTest extends PuthTestCase
{
    function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev')
                ->assertSee('Puth');
        });
    }
}
