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
}
