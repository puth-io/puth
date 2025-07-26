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
