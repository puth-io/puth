<?php

namespace Puth\Laravel\Concerns;

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
        return $this->findAll($selector);
    }
    
    /**
     * Get the element matching the given selector.
     *
     * @param string $selector
     */
    public function element($selector)
    {
        return $this->find($selector);
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
        return $this->_keys($selector, $keys);
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
            $value = $value === null ? [] : (!is_array($value) ? [$value] : $value);
            $values = collect($value)->transform(function ($value) {
                if (is_bool($value)) {
                    return $value ? '1' : '0';
                }
                
                return (string)$value;
            })->all();
    
            $select->select(...$values);
        }
        
        return $this;
    }
    
//    /**
//     * Select the given value of a radio button field.
//     *
//     * @param string $field
//     * @param string $value
//     * @return $this
//     */
//    public function radio($field, $value)
//    {
//        $this->resolver->resolveForRadioSelection($field, $value)->click();
//
//        return $this;
//    }
    
//    /**
//     * Check the given checkbox.
//     *
//     * @param string $field
//     * @param string|null $value
//     * @return $this
//     */
//    public function check($field, $value = null)
//    {
//        $element = $this->resolver->resolveForChecking($field, $value);
//
//        if (!$element->checked) {
//            $element->click();
//        }
//
//        return $this;
//    }
    
//    /**
//     * Uncheck the given checkbox.
//     *
//     * @param string $field
//     * @param string|null $value
//     * @return $this
//     */
//    public function uncheck($field, $value = null)
//    {
//        $element = $this->resolver->resolveForChecking($field, $value);
//
//        if ($element->checked) {
//            $element->click();
//        }
//
//        return $this;
//    }
    
    /**
     * Attach the given file to the field.
     *
     * @param string $field
     * @param string|array<string> $paths
     * @return $this
     */
    public function attach($field, $paths)
    {
        $paths = $paths === null ? [] : (!is_array($paths) ? [$paths] : $paths);
        
        $element = $this->resolver->resolveForAttachment($field);
        
        $tmpFilePaths = [];
        foreach ($paths as $path) {
            $tmpFilePaths[] = $this->context->saveTemporaryFile(basename($path), base64_encode(file_get_contents($path)));
        }
        
        $element->uploadFile(...$tmpFilePaths);
        
        return $this;
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
}
