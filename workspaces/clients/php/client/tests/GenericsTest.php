<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class GenericsTest extends PuthTestCase
{
    protected string $baseUrl = 'https://playground.puth.dev/';
    
    function test_generic()
    {
        var_dump($this->page->get('#actions-type input')->screenshot([]));
//        var_dump($this->page->get('#actions-type input'));
    }
}