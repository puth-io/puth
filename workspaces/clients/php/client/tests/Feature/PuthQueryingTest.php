<?php

namespace Tests\Feature;


class PuthQueryingTest extends PlaygroundTestCase
{
    
    function testGet()
    {
        $this->assertEquals('querying-get', $this->page->get('#querying-get')->getProperty('id')->jsonValue());
    }
    
    function testGetAll()
    {
        $this->assertCount(2, $this->page->getAll('.querying-get'));
    }
    
    function testContains()
    {
        $this->assertCount(3, $this->page->get('#querying-contains')->contains('apple'));
    }
}