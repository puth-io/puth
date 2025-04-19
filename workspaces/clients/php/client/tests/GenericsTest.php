<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class GenericsTest extends PuthTestCase
{
    protected string $baseUrl = 'https://playground.puth.dev/';
    
    function test_generic()
    {
        var_export($this->page->get('#actions-type input')->screenshot([]));
        $this->markTestSkipped();
    }
}
