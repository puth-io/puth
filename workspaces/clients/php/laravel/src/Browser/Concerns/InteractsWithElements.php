<?php

namespace Puth\Laravel\Browser\Concerns;

use Illuminate\Support\Arr;

trait InteractsWithElements
{
    private $dragInterceptionEnabled = false;
    
    /**
     * Get all of the elements matching the given selector.
     *
     * @param string $selector
     */
    public function elements($selector)
    {
        return $this->resolver->all($selector);
    }
    
    /**
     * Get the element matching the given selector.
     *
     * @param string $selector
     */
    public function element($selector)
    {
        return $this->resolver->find($selector);
    }
    
    /**
     * Click the link with the given text.
     *
     * @param string $link
     * @param string $element
     * @return $this
     */
    public function clickLink($link, $element = 'a')
    {
        $selector = $this->resolver->format($element) . "[href='{$link}']";
        
        $this->resolver->findOrFail($selector)->click();
        
        return $this;
    }
    
    /**
     * Directly get or set the value attribute of an input field.
     *
     * @param string $selector
     * @param string|null $value
     * @return $this
     */
    public function value($selector, $value = null)
    {
        if (is_null($value)) {
            return $this->resolver->findOrFail($selector)->value();
        }
    
        $this->resolver->findOrFail($selector)->value($value);
    
        return $this;
    }
    
    /**
     * Get the text of the element matching the given selector.
     *
     * @param string $selector
     * @return string
     */
    public function text($selector)
    {
        return $this->resolver->findOrFail($selector)->innerText();
    }
    
    /**
     * Get the given attribute from the element matching the given selector.
     *
     * @param string $selector
     * @param string $attribute
     * @return string
     */
    public function attribute($selector, $attribute)
    {
        return $this->resolver->findOrFail($selector)->getProperty($attribute)->jsonValue();
    }
    
    /**
     * Send the given keys to the element matching the given selector.
     *
     * @param string $selector
     * @param mixed $keys
     * @return $this
     */
    public function keys($selector, ...$keys)
    {
        $element = $this->resolver->findOrFail($selector);
        
        foreach ($keys as $key) {
            if (is_array($key)) {
                $key = implode($key);
            }
    
            $element->type($key);
        }
        
        return $this;
    }
    
    /**
     * Type the given value in the given field.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function type($field, $value)
    {
        $this->resolver->resolveForTyping($field)->clear()->type($value);
        
        return $this;
    }
    
    /**
     * Type the given value in the given field slowly.
     *
     * @param string $field
     * @param string $value
     * @param int $pause
     * @return $this
     */
    public function typeSlowly($field, $value, $pause = 100)
    {
        $this->clear($field)->appendSlowly($field, $value, $pause);
        
        return $this;
    }
    
    /**
     * Type the given value in the given field without clearing it.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function append($field, $value)
    {
        $this->resolver->resolveForTyping($field)->type($value);
        
        return $this;
    }
    
    /**
     * Type the given value in the given field slowly without clearing it.
     *
     * @param string $field
     * @param string $value
     * @param int $pause
     * @return $this
     */
    public function appendSlowly($field, $value, $pause = 100)
    {
        foreach (preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) as $char) {
            $this->append($field, $char)->pause($pause);
        }
        
        return $this;
    }
    
    /**
     * Clear the given field.
     *
     * @param string $field
     * @return $this
     */
    public function clear($field)
    {
        $this->resolver->resolveForTyping($field)->clear();
        
        return $this;
    }
    
    /**
     * Select the given value or random value of a drop-down field.
     *
     * @param string $field
     * @param string|array|null $value
     * @return $this
     */
    public function select($field, $value = null)
    {
        $element = $this->resolver->resolveForSelection($field);
    
        $options = array_map(function ($option) {
            return $option->value();
        }, $element->children('option'));
        
        $select = $element->tagName === 'SELECT' ? $element : null;
        
        if (func_num_args() === 1) {
            $element->select($options[array_rand($options)]);
        } else {
            $values = collect(Arr::wrap($value))->transform(function ($value) {
                if (is_bool($value)) {
                    return $value ? '1' : '0';
                }
                
                return (string)$value;
            })->all();
    
            $select->select(...$values);
        }
        
        return $this;
    }
    
    /**
     * Select the given value of a radio button field.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function radio($field, $value)
    {
        $this->resolver->resolveForRadioSelection($field, $value)->click();
        
        return $this;
    }
    
    /**
     * Check the given checkbox.
     *
     * @param string $field
     * @param string|null $value
     * @return $this
     */
    public function check($field, $value = null)
    {
        $element = $this->resolver->resolveForChecking($field, $value);
        
        if (!$element->checked) {
            $element->click();
        }
        
        return $this;
    }
    
    /**
     * Uncheck the given checkbox.
     *
     * @param string $field
     * @param string|null $value
     * @return $this
     */
    public function uncheck($field, $value = null)
    {
        $element = $this->resolver->resolveForChecking($field, $value);
        
        if ($element->checked) {
            $element->click();
        }
        
        return $this;
    }
    
    /**
     * Attach the given file to the field.
     *
     * @param string $field
     * @param string|array<string> $paths
     * @return $this
     */
    public function attach($field, $paths)
    {
        $paths = Arr::wrap($paths);
        
        $element = $this->resolver->resolveForAttachment($field);
    
        [$fileChooser] = $element->clickAndFile();
        
        $tmpFiles = [];
        foreach ($paths as $path) {
            $tmpFiles[] = $this->context->saveTemporaryFile(basename($path), file_get_contents($path));
        }
        
        $fileChooser->accept($tmpFiles);
        
        return $this;
    }
    
    /**
     * Press the button with the given text or name.
     *
     * @param string $button
     * @return $this
     */
    public function press($button)
    {   
        // TODO check implementation
        $this->resolver->resolveForButtonPress($button)->click();
        
        return $this;
    }
    
    /**
     * Press the button with the given text or name.
     *
     * @param string $button
     * @param int $seconds
     * @return $this
     */
    public function pressAndWaitFor($button, $seconds = 5)
    {
        $element = $this->resolver->resolveForButtonPress($button);
        
        $element->click();
        
        return $this->waitUsing($seconds, 100, function () use ($element) {
            return ! $element->disabled;
        });
    }
    
    private function ensureDragInterceptionIsOn() {
        if (!$this->dragInterceptionEnabled) {
            $this->site->setDragInterception(true);
            $this->dragInterceptionEnabled = true;
        }
    }
    
    /**
     * Drag an element to another element using selectors.
     *
     * @param string $from
     * @param string $to
     * @return $this
     */
    public function drag($from, $to)
    {
        $this->ensureDragInterceptionIsOn();
        
        $this->resolver->findOrFail($from)->dragAndDrop(
            $this->resolver->findOrFail($to)
        );
        
        return $this;
    }
    
    /**
     * Drag an element up.
     *
     * @param string $selector
     * @param int $offset
     * @return $this
     */
    public function dragUp($selector, $offset)
    {
        return $this->dragOffset($selector, 0, -$offset);
    }
    
    /**
     * Drag an element down.
     *
     * @param string $selector
     * @param int $offset
     * @return $this
     */
    public function dragDown($selector, $offset)
    {
        return $this->dragOffset($selector, 0, $offset);
    }
    
    /**
     * Drag an element to the left.
     *
     * @param string $selector
     * @param int $offset
     * @return $this
     */
    public function dragLeft($selector, $offset)
    {
        return $this->dragOffset($selector, -$offset, 0);
    }
    
    /**
     * Drag an element to the right.
     *
     * @param string $selector
     * @param int $offset
     * @return $this
     */
    public function dragRight($selector, $offset)
    {
        return $this->dragOffset($selector, $offset, 0);
    }
    
    /**
     * Drag an element by the given offset.
     *
     * @param string $selector
     * @param int $x
     * @param int $y
     * @return $this
     */
    public function dragOffset($selector, $x = 0, $y = 0)
    {
        $this->ensureDragInterceptionIsOn();
        
        $this->resolver->findOrFail($selector)->drag([
            'x' => $x,
            'y' => $y,
        ]);
        
        return $this;
    }
    
    /**
     * Accept a JavaScript dialog.
     *
     * @return $this
     */
    public function acceptDialog($value = '')
    {
        $this->site->acceptDialog($value);
        
        return $this;
    }
    
    /**
     * Dismiss a JavaScript dialog.
     *
     * @return $this
     */
    public function dismissDialog()
    {
        $this->site->dismissDialog();
    
        return $this;
    }
}