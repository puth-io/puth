<?php

namespace Tests\Feature;

use Puth\PuthTestCase;
use Puth\Traits\PuthAssertions;

class PuthActionsTest extends PuthTestCase
{
    use PuthAssertions;
    
    protected string $baseUrl = 'https://playground.puth.dev/';

    function testType()
    {
        $input = $this->page->get('#actions-type input')->type('puth test verify');
        $this->assertEquals('puth test verify', $input->value());
    }
    
    function testFocus()
    {
        $input = $this->page->get('#actions-focus')->focus();
        $this->assertElementEquals($input, $this->page->focused());
    }
    
    function testFocusSelector()
    {
        $this->page->focus('#actions-focus');
        $this->assertElementEquals($this->page->get('#actions-focus'), $this->page->focused());
    }
    
    function testBlur()
    {
        $this->page->get('#actions-focus')->focus()->blur();
        $this->assertElementEquals($this->page->get('body'), $this->page->focused());
    }
    
    function testBlurSelector()
    {
        $this->page->focus('#actions-focus');
        $this->page->blur('#actions-focus');
        
        // Assert that the body (default) is focused
        $this->assertElementEquals($this->page->get('body'), $this->page->focused());
    }
    
    function testClear()
    {
        $input = $this->page->get('#actions-type input')
            ->type('puth test verify')
            ->clear();
        $this->assertEquals('', $input->value());
    }
    
    function testClick()
    {
        $this->page->get('#actions-click button')->click();
        $this->assertEquals('clicked button', $this->page->get('#actions-click-verify')->getProperty('innerText')->jsonValue());
    }
    
    function testDoubleClick()
    {
        $this->page->get('#actions-click-double')->doubleClick();
        $this->assertEquals('double clicked button', $this->page->get('#actions-click-double-verify')->getProperty('innerText')->jsonValue());
    }
    
    function testMiddleClick()
    {
        $this->page->get('#actions-click-mousedown')->middleClick();
        $this->assertEquals('mousedown: ' . 2, $this->page->get('#actions-click-mousedown-verify')->getProperty('innerText')->jsonValue());
    }
    
    function testRightClick()
    {
        $this->page->get('#actions-click-mousedown')->rightClick();
        $this->assertEquals('mousedown: ' . 3, $this->page->get('#actions-click-mousedown-verify')->getProperty('innerText')->jsonValue());
    }
    
    function testSelect()
    {
        $select = $this->page->get('#actions-select');
        $select->select('apple');
        $this->assertEquals('apple', $select->value());
    }
    
    function testSelectMultiple()
    {
        $select = $this->page->get('#actions-select-multiple');
        $select->select('apple', 'orange');
        $this->assertEquals(['apple', 'orange'], $select->selected());
    }
    
    // TODO works but needs assertion
    // function testScrollIntoView() {
    //     $this->page->get('#actions-scrollIntoView')->scrollIntoView();
    // }
    
    // TODO works but needs assertion
    // function testScrollTo() {
    //     $this->page->get('#actions-scrollIntoView')->scrollIntoView();
    //     $this->page->get('#actions-scrollTo')->scrollTo(0, 100);
    // }
}
