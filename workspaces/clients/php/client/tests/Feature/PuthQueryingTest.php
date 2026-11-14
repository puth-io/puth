<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class PuthQueryingTest extends PuthTestCase
{
    function testGet()
    {
        $this->page->setContent('<div id="querying-get">Div with id querying-get</div>');

        $this->assertEquals('querying-get', $this->page->get('#querying-get')->getProperty('id')->jsonValue());
    }
    
    function testGetAll()
    {
        $this->page->setContent(<<<'HTML'
<div class="querying-get">Div with class querying-get</div>
<div class="querying-get">Div with class querying-get</div>
HTML);

        $this->assertCount(2, $this->page->getAll('.querying-get'));
    }
    
    function testContains()
    {
        $this->page->setContent(<<<'HTML'
<div id="querying-contains">
  <div>Text containing apple</div>
  <div>Text containing apple</div>
</div>
HTML);

        // The container and both children contain the text.
        $this->assertCount(3, $this->page->get('#querying-contains')->contains('apple'));
    }
}
