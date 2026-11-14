<?php

namespace Tests\Browser\Pages;

use Puth\Laravel\Page;

/**
 * The page the primary fixture origin serves for every path without a file extension.
 */
class Fixture extends Page
{
    /**
     * Get the URL for the page.
     *
     * @return string
     */
    public function url()
    {
        return config('puth.fixture');
    }
    
    /**
     * Assert that the browser is on the page.
     *
     * @return void
     */
    public function assert($browser)
    {
        $browser->assertUrlIs($this->url())
            ->assertTitle('Puth fixture');
    }
}
