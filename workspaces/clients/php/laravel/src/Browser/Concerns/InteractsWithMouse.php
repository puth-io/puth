<?php

namespace Puth\Laravel\Browser\Concerns;

use Exception;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/InteractsWithMouse.php
 *
 * The MIT License (MIT)
 *
 * Copyright (c) Taylor Otwell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
trait InteractsWithMouse
{
    /**
     * Move the mouse by offset X and Y.
     *
     * @deprecated Can not be implemented by Puth
     *
     * @param int $xOffset
     * @param int $yOffset
     *
     * @throws Exception
     */
    public function moveMouse($xOffset, $yOffset)
    {
        throw new \Exception('[moveMouse] is impossible to implement in Puth.');
        /**
         * The problem is that puppeteer does not track the mouse position, therefore we
         * can not apply any "offset". We could've implemented this if this would've moved
         * the mouse to an absolute position.
         */
    }
    
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
     * Control click the element at the given selector.
     *
     * @param  string|null  $selector
     * @return $this
     */
    public function controlClick($selector = null)
    {
        // TODO implement
        return $this->withKeyboard(function (Keyboard $keyboard) use ($selector) {
            $key = OperatingSystem::onMac() ? WebDriverKeys::META : WebDriverKeys::CONTROL;
            
            $keyboard->press($key);
            $this->click($selector);
            $keyboard->release($key);
        });
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
