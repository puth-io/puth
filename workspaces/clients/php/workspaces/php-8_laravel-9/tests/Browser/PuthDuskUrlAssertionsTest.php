<?php

namespace Tests\Feature;

use Puth\PuthTestCase;
use Puth\Traits\PuthDuskUrlAssertions;

class PuthDuskUrlAssertionsTest extends PuthTestCase
{
    use PuthDuskUrlAssertions;
    
    protected string $baseUrl = 'https://playground.puth.dev/';
    
    public function testAssertUrlIs()
    {
        $this->assertUrlIs($this->baseUrl);
    }
    
    public function testAssertSchemeIs()
    {
        $this->assertSchemeIs('https');
    }
    
    public function testAssertSchemeIsNot()
    {
        $this->assertSchemeIsNot('http');
    }
    
    public function testAssertHostIs()
    {
        $this->assertHostIs('playground.puth.dev');
    }
    
    public function testAssertHostIsNot()
    {
        $this->assertHostIsNot('not.the.host');
    }
    
    public function testAssertPortIs() {
        $this->assertPortIs(443);
    }
    
    public function testAssertPortIsNot() {
        $this->assertPortIsNot(12345);
    }
    
    public function testAssertPathIs()
    {
        $this->page->goto('https://example.cypress.io/commands/querying');
        $this->assertPathIs('/commands/querying');
    }
    
    public function testAssertPathBeginsWith()
    {
        $this->page->goto('https://example.cypress.io/commands/querying');
        $this->assertPathBeginsWith('/commands');
    }
    
    public function testAssertPathIsNot()
    {
        $this->page->goto('https://example.cypress.io/commands/querying');
        $this->assertPathIsNot('querying');
    }

    public function testAssertFragmentIs()
    {
        $this->page->goto('https://example.cypress.io/commands/querying#test');
        $this->assertFragmentIs('test');
    }
    
    public function testAssertFragmentBeginsWith()
    {
        $this->page->goto('https://example.cypress.io/commands/querying#test-234');
        $this->assertFragmentBeginsWith('test');
    }
    
    public function testAssertFragmentIsNot()
    {
        $this->page->goto('https://example.cypress.io/commands/querying#test-234');
        $this->assertFragmentIsNot('test-not');
    }
    
    // public function testAssertRouteIs()
    // {
    //     // TODO $this->assertRouteIs();
    // }
    
    public function testAssertQueryStringHas()
    {
        $this->page->goto('https://example.cypress.io/commands/querying?test=puth');
        $this->assertQueryStringHas('test', 'puth');
    }
    
    public function testAssertQueryStringMissing()
    {
        $this->assertQueryStringMissing('test');
    }
    
    public function testAssertHasQueryStringParameter()
    {
        $this->page->goto('https://example.cypress.io/commands/querying?test=puth');
        $this->assertHasQueryStringParameter('test');
    }
}