<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class PuthTraversalTest extends PuthTestCase
{
    private function setTraversalParent(): void
    {
        $this->page->setContent(<<<'HTML'
<div id="traversal-parent">
  Div with id traversal-parent
  <div>Child 1</div>
  <div class="traversal-child-selector">Child 2</div>
  <div class="traversal-child-selector">Child 3</div>
</div>
HTML);
    }

    function testChildren()
    {
        $this->setTraversalParent();

        $this->assertCount(3, $this->page->get('#traversal-parent')->children());
    }
    
    function testChildrenSelector()
    {
        $this->setTraversalParent();

        $this->assertCount(2, $this->page->get('#traversal-parent')->children('.traversal-child-selector'));
    }
    
    function testParent()
    {
        $this->page->setContent(<<<'HTML'
<div class="test-feature-verify">
  Wrapper div
  <div id="traversal-child">Div with id traversal-child</div>
</div>
HTML);

        $actual = $this->page->get('#traversal-child')->parent()->getProperty('className')->jsonValue();
        $this->assertEquals('test-feature-verify', $actual);
    }
    
    function testParents()
    {
        $this->page->setContent(<<<'HTML'
<section>
  <div>
    <div>Child 1</div>
    <div id="traversal-siblings">Child 2</div>
    <div>Child 3</div>
  </div>
</section>
HTML);

        // The element itself, div, section, body and html.
        $this->assertCount(5, $this->page->get('#traversal-siblings')->parents());
    }
}
