<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

class PuthActionsTest extends PuthTestCase
{
    function testType()
    {
        $this->page->setContent('<input type="text">');

        $input = $this->page->get('input')->type('puth test verify');
        $this->assertEquals('puth test verify', $input->value());
    }
    
    function testFocus()
    {
        $this->page->setContent('<input type="text" id="actions-focus">');

        $input = $this->page->get('#actions-focus')->focus();
        $this->assertElementEquals($input, $this->page->focused());
    }
    
    function testFocusSelector()
    {
        $this->page->setContent('<input type="text" id="actions-focus">');

        $this->page->focus('#actions-focus');
        $this->assertElementEquals($this->page->get('#actions-focus'), $this->page->focused());
    }
    
    function testBlur()
    {
        $this->page->setContent('<input type="text" id="actions-focus">');

        $this->page->get('#actions-focus')->focus()->blur();
        $this->assertElementEquals($this->page->get('body'), $this->page->focused());
    }
    
    function testBlurSelector()
    {
        $this->page->setContent('<input type="text" id="actions-focus">');

        $this->page->focus('#actions-focus');
        $this->page->blur('#actions-focus');
        
        // Assert that the body (default) is focused
        $this->assertElementEquals($this->page->get('body'), $this->page->focused());
    }
    
    function testClear()
    {
        $this->page->setContent('<input type="text">');

        $input = $this->page->get('input')
            ->type('puth test verify')
            ->clear();
        $this->assertEquals('', $input->value());
    }
    
    function testClick()
    {
        $this->page->setContent(<<<'HTML'
<button onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button>
<p id="verify"></p>
HTML);

        $this->page->get('button')->click();
        $this->assertEquals('clicked button', $this->page->get('#verify')->getProperty('innerText')->jsonValue());
    }
    
    function testDoubleClick()
    {
        $this->page->setContent(<<<'HTML'
<button ondblclick="document.querySelector('#verify').innerText = 'double clicked button'">double click</button>
<p id="verify"></p>
HTML);

        $this->page->get('button')->doubleClick();
        $this->assertEquals('double clicked button', $this->page->get('#verify')->getProperty('innerText')->jsonValue());
    }

    private function setMousedownPage(): void
    {
        $this->page->setContent(<<<'HTML'
<button onmousedown="document.querySelector('#verify').innerText = 'mousedown: ' + event.which">mousedown event</button>
<p id="verify"></p>
HTML);
    }
    
    function testMiddleClick()
    {
        $this->setMousedownPage();

        $this->page->get('button')->middleClick();
        $this->assertEquals('mousedown: ' . 2, $this->page->get('#verify')->getProperty('innerText')->jsonValue());
    }
    
    function testRightClick()
    {
        $this->setMousedownPage();

        $this->page->get('button')->rightClick();
        $this->assertEquals('mousedown: ' . 3, $this->page->get('#verify')->getProperty('innerText')->jsonValue());
    }
    
    function testSelect()
    {
        $this->page->setContent(<<<'HTML'
<select>
  <option value="" selected disabled>-- Select Value --</option>
  <option value="apple">Apple</option>
  <option value="orange">Orange</option>
</select>
HTML);

        $select = $this->page->get('select');
        $select->select('apple');
        $this->assertEquals('apple', $select->value());
    }
    
    function testSelectMultiple()
    {
        $this->page->setContent(<<<'HTML'
<select multiple>
  <option value="apple">Apple</option>
  <option value="orange">Orange</option>
</select>
HTML);

        $select = $this->page->get('select');
        $select->select('apple', 'orange');
        $this->assertEquals(['apple', 'orange'], $select->selected());
    }
}
