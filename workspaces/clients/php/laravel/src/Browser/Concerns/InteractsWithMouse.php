<?php

namespace Puth\Laravel\Browser\Concerns;

use Exception;

trait InteractsWithMouse
{
    /**
     * Move the mouse over the given selector.
     *
     * @param string $selector
     * @return $this
     */
    public function mouseover($selector)
    {
        $this->resolver->findOrFail($selector)->hover();
        
        return $this;
    }
    
    /**
     * Click the element at the given selector.
     *
     * @param string $selector
     * @return $this
     */
    public function click($selector, $options = [])
    {
        if (isset($this->legacyBrowserHandling) && $this->legacyBrowserHandling) {
            $options['unblockOnDialogOpen'] = true;
        }
        
        foreach ($this->resolver->all($selector) as $element) {
            try {
                $element->click($options);
                
                return $this;
            } catch (Exception $e) {
                //
            }
        }
        
        throw $e ?? new Exception("Unable to locate element with selector [{$selector}].");
    }
    
    /**
     * Click the topmost element at the given pair of coordinates.
     *
     * @param int $x
     * @param int $y
     * @return $this
     */
    public function clickAtPoint($x, $y)
    {
        $this->site->mouse->click($x, $y);
        
        return $this;
    }
    
    /**
     * Click the element at the given XPath expression.
     *
     * @param string $expression
     * @return $this
     */
    public function clickAtXPath($expression)
    {
        $elements = $this->site->getX($expression);
        
        if (count($elements) === 0) {
            throw new Exception('No such element found');
        }
    
        $elements[0]->click();
        
        return $this;
    }
    
    /**
     * Perform a mouse click and hold the mouse button down at the given selector.
     *
     * @param string|null $selector
     * @return $this
     */
    public function clickAndHold($selector)
    {
        $element = $this->resolver->findOrFail($selector);
        $element->scrollIntoView();
        $point = $element->clickablePoint();
        $this->site->mouse->move($point->x, $point->y);
        $this->site->mouse->down();
        
        return $this;
    }
    
    /**
     * Double click the element at the given selector.
     *
     * @param string|null $selector
     * @return $this
     */
    public function doubleClick($selector)
    {
        $this->resolver->findOrFail($selector)->click(['clickCount' => 2]);
        
        return $this;
    }
    
    /**
     * Right click the element at the given selector.
     *
     * @param string|null $selector
     * @return $this
     */
    public function rightClick($selector = null)
    {
        $this->resolver->findOrFail($selector)->click(['button' => 'right']);
        
        return $this;
    }
    
    /**
     * Release the currently clicked mouse button.
     *
     * @return $this
     */
    public function releaseMouse()
    {
        $this->site->mouse->up();
        
        return $this;
    }
}