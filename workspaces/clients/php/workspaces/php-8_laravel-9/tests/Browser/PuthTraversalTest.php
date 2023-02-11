<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class PuthTraversalTest extends PuthTestCase
{
    protected string $baseUrl = 'https://playground.puth.dev/';
    
    function testChildren()
    {
        $this->assertCount(3, $this->page->get('#traversal-parent')->children());
    }
    
    function testChildrenSelector()
    {
        $this->assertCount(2, $this->page->get('#traversal-parent')->children('.traversal-child-selector'));
    }
    
    function testParent()
    {
        $actual = $this->page->get('#traversal-child')->parent()->getProperty('className')->jsonValue();
        $this->assertEquals('test-feature-verify', $actual);
    }
    
    function testParents()
    {
        $this->assertCount(6, $this->page->get('#traversal-siblings')->parents());
    }
}