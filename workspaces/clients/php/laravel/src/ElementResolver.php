<?php

namespace Puth\Laravel;

use Illuminate\Support\Str;
use Illuminate\Support\Traits\Macroable;
use InvalidArgumentException;
use Puth\RemoteObject;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/ElementResolver.php
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
class ElementResolver
{
    use Macroable;
    
    public Browser $browser;
    
    /**
     * The selector prefix for the resolver.
     *
     * @var string
     */
    public $prefix;
    
    /**
     * Set the elements the resolver should use as shortcuts.
     *
     * @var array
     */
    public $elements = [];
    
    /**
     * The button finding methods.
     *
     * @var array
     */
    protected $buttonFinders = [
        'findById',
        'findButtonBySelector',
        'findButtonByName',
        'findButtonByValue',
        'findButtonByText',
    ];
    
    /**
     * Create a new element resolver instance.
     */
    public function __construct(Browser $browser, string $prefix = 'body')
    {
        $this->browser = $browser;
        $this->prefix = trim($prefix);
    }
    
    /**
     * Set the page elements the resolver should use as shortcuts.
     *
     * @param array $elements
     * @return $this
     */
    public function pageElements(array $elements)
    {
        uksort($elements, function ($a, $b) {
            return strlen($b) <=> strlen($a);
        });

        $this->elements = $elements;
        
        return $this;
    }
    
    /**
     * Resolve the element for a given select "field".
     */
    public function resolveForSelection(string $field)
    {
        return $this->browser->_firstOrFail($this->getSelectionSelectors($field));
    }
    
    /**
     * Resolve the element for a given radio "field" / value.
     *
     * @param string $field
     * @param string|null $value
     * @return mixed
     *
     * @throws \Exception
     * @throws \InvalidArgumentException
     */
    public function resolveForRadioSelection($field, $value = null)
    {
        if (!is_null($element = $this->findById($field))) {
            return $element;
        }
        
        if (is_null($value)) {
            throw new InvalidArgumentException(
                "No value was provided for radio button [{$field}]."
            );
        }
        
        return $this->firstOrFail([
            "input[type=radio][name='{$field}'][value='{$value}']", $field,
        ]);
    }
    
    /**
     * Resolve the element for a given checkbox "field".
     *
     * @param string|null $field
     * @param string|null $value
     * @return mixed
     *
     * @throws \Exception
     */
    public function resolveForChecking($field, $value = null)
    {
        if (!is_null($element = $this->findById($field))) {
            return $element;
        }
        
        $selector = 'input[type=checkbox]';
        
        if (!is_null($field)) {
            $selector .= "[name='{$field}']";
        }
        
        if (!is_null($value)) {
            $selector .= "[value='{$value}']";
        }
        
        return $this->firstOrFail([
            $selector, $field,
        ]);
    }
    
    /**
     * Resolve the element for a given file "field".
     *
     * @param string $field
     * @return mixed
     *
     * @throws \Exception
     */
    public function resolveForAttachment($field)
    {
        if (!is_null($element = $this->findById($field))) {
            return $element;
        }
        
        return $this->firstOrFail([
            "input[type=file][name='{$field}']", $field,
        ]);
    }
    
    /**
     * Resolve the element for a given "field".
     *
     * @param string $field
     * @return mixed
     *
     * @throws \Exception
     */
    public function resolveForField($field)
    {
        if (!is_null($element = $this->findById($field))) {
            return $element;
        }
        
        return $this->firstOrFail([
            "input[name='{$field}']", "textarea[name='{$field}']",
            "select[name='{$field}']", "button[name='{$field}']", $field,
        ]);
    }
    
    /**
     * Resolve the element for a given button.
     *
     * @param string $button
     * @return mixed
     *
     * @throws \InvalidArgumentException
     */
    public function resolveForButtonPress($button)
    {
        foreach ($this->buttonFinders as $method) {
            if (!is_null($element = $this->{$method}($button))) {
                return $element;
            }
        }
        
        throw new InvalidArgumentException(
            "Unable to locate button [{$button}]."
        );
    }

    /**
     * @param string $field
     *
     * @return string[]
     */
    public function getTypingSelectors(string $field): array
    {
        return [$field, "input[name='{$field}']", "textarea[name='{$field}']"];
    }

    /**
     * @param string $field
     *
     * @return string[]
     */
    public function getSelectionSelectors(string $field): array
    {
        return [$field, "select[name='{$field}']"];
    }

    /**
     * @param string $selector
     *
     * @return false|int
     */
    public function isIdSelector(string $selector): int|false
    {
        return preg_match('/^#[\w\-:]+$/', $selector);
    }

    /**
     * Resolve the element for a given button by selector.
     *
     * @param string $button
     * @return mixed|null
     */
    protected function findButtonBySelector($button)
    {
        if (!is_null($element = $this->find($button))) {
            return $element;
        }
    }
    
    /**
     * Resolve the element for a given button by name.
     *
     * @param string $button
     * @return mixed|null
     */
    protected function findButtonByName($button)
    {
        if (!is_null($element = $this->find("input[type=submit][name='{$button}']")) ||
            !is_null($element = $this->find("input[type=button][value='{$button}']")) ||
            !is_null($element = $this->find("button[name='{$button}']"))) {
            return $element;
        }
    }
    
    /**
     * Resolve the element for a given button by value.
     *
     * @param string $button
     * @return mixed|null
     */
    protected function findButtonByValue($button)
    {
        foreach ($this->all('input[type=submit]') as $element) {
            if ($element->getAttribute('value') === $button) {
                return $element;
            }
        }
    }
    
    /**
     * Resolve the element for a given button by text.
     *
     * @param string $button
     * @return mixed|null
     */
    protected function findButtonByText($button)
    {
        foreach ($this->all('button') as $element) {
            if (Str::contains($element->getText(), $button)) {
                return $element;
            }
        }
    }
    
    /**
     * Attempt to find the selector by ID.
     *
     * @param string $selector
     * @return mixed|null
     */
    protected function findById($selector)
    {
        if ($this->isIdSelector($selector)) {
            return $this->browser->_firstOrFail($selector, ['timeout' => 0]);
        }
    }
    
    /**
     * Find an element by the given selector or return null.
     *
     * @param string $selector
     * @return mixed|null
     */
    public function find($selector)
    {
        try {
            return $this->findOrFail($selector);
        } catch (\Exception $e) {
            //
        }

        return null;
    }
    
    /**
     * Get the first element matching the given selectors.
     *
     * @param array $selectors
     * @return mixed
     * @throws \Exception
     */
    public function firstOrFail($selectors)
    {
        return $this->browser->_firstOrFail((array) $selectors);
    }

    /**
     * Find an element by the given selector or throw an exception.
     *
     * @param string $selector
     * @return mixed
     * @throws \Exception
     */
    public function findOrFail($selector)
    {
        $selectors = [];
        if ($this->isIdSelector($selector)) {
            $selectors[] = $selector;
        }
        $selectors[] = $this->format($selector);

        return $this->firstOrFail($selectors);
    }
    
    /**
     * Find the elements by the given selector or return an empty array.
     *
     * @param string $selector
     * @return mixed[]
     */
    public function all($selector)
    {
        return $this->browser->findAll($selector);
    }
    
    /**
     * Format the given selector with the current prefix.
     *
     * @param string $selector
     * @return string
     */
    public function format($selector)
    {
        $selector = str_replace(
            array_keys($this->elements), array_values($this->elements), $originalSelector = $selector
        );

        if (str_starts_with($selector, '@') && $selector === $originalSelector) {
            // TODO put Dusk::selectorHtmlAttribute in PuthManager
            $selector = preg_replace('/@(\S+)/', '[dusk="$1"]', $selector);
        }

        return trim($this->prefix.' '.$selector);
    }
}
