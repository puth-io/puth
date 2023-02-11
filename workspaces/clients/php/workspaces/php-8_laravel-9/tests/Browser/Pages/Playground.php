<?php

namespace Tests\Browser\Pages;

use Puth\Laravel\Browser\Page;

class Playground extends Page
{
    /**
     * Get the URL for the page.
     *
     * @return string
     */
    public function url()
    {
        return 'https://playground.puth.dev/';
    }
    
    /**
     * Assert that the browser is on the page.
     *
     * @return void
     */
    public function assert($browser)
    {
        $browser->assertUrlIs($this->url());
    }
    
    /**
     * Get the element shortcuts for the page.
     *
     * @return array
     */
    public function elements()
    {
        return [
            '@input-type' => '#actions-type input',
            '@input-focus' => '#actions-focus',
            '@input-clear' => '#actions-clear',
        ];
    }
}