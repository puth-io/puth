<?php

namespace Tests\Feature;

use Puth\PuthTestCase;
use Puth\Traits\PuthDuskInteractsWithCookies;

class PuthDuskInteractsWithCookiesTest extends PuthTestCase
{
    use PuthDuskInteractsWithCookies;
    
    protected string $baseUrl = 'https://playground.puth.dev/';
    
    // function testAddCookie()
    // {
    //     $page = new ProductPage();
    //
    //     // TODO write test
    // }
    
}