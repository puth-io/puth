<?php

namespace Puth\Laravel\Concerns;

use Puth\Laravel\Keyboard;

trait InteractsWithKeyboard
{
    /**
     * Execute the given callback while interacting with the keyboard.
     *
     * @param  callable(\Puth\Laravel\Keyboard):void  $callback
     * @return $this
     */
    public function withKeyboard(callable $callback)
    {
        $callback(new Keyboard($this));
        return $this;
    }
    
    /**
     * Parse the keys before sending to the keyboard.
     *
     * @param  array  $keys
     * @return array
     */
    public function parseKeys($keys)
    {
        if (is_array($keys)) {
            return array_map(fn ($comb) => is_array($comb) ? join('', $comb) : $comb, $keys);
        } else {
            throw new \Exception('Unsupported parameter type. Should be string or array.');
        }
    }
}
