<?php

namespace Puth\Laravel\Concerns;

trait InteractsWithElements
{
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
}
