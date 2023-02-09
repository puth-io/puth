<?php

namespace Puth\Laravel\BrowserProxy;

abstract class Page
{
    /**
     * Get the URL for the page.
     *
     * @return string
     */
    abstract public function url();
    
    /**
     * Assert that the browser is on the page.
     *
     * @param BrowserProxy $browser
     * @return void
     */
    public function assert(BrowserProxy $browser)
    {
        //
    }
    
    /**
     * Get the element shortcuts for the page.
     *
     * @return array
     */
    public function elements()
    {
        return [];
    }
    
    /**
     * Get the global element shortcuts for the site.
     *
     * @return array
     */
    public static function siteElements()
    {
        return [];
    }
}