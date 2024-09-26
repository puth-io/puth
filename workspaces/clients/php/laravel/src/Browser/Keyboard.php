<?php

namespace Puth\Laravel\Browser;

use BadMethodCallException;
use Illuminate\Support\Traits\Macroable;

class Keyboard
{
    use Macroable {
        __call as macroCall;
    }
    
    /**
     * The browser instance.
     *
     * @var \Puth\Laravel\Browser\Browser
     */
    public $browser;
    
    private $keyboard;
    
    /**
     * Create a keyboard instance.
     *
     * @param  \Puth\Laravel\Browser\Browser  $browser
     * @return void
     */
    public function __construct(Browser $browser)
    {
        $this->browser = $browser;
        $this->keyboard = $this->browser->site->keyboard;
    }
    
    /**
     * Press the key using keyboard.
     *
     * @return $this
     */
    public function press($key)
    {
        $this->keyboard->down($key);
        
        return $this;
    }
    
    /**
     * Release the given pressed key.
     *
     * @return $this
     */
    public function release($key)
    {
        $this->keyboard->up($key);
        
        return $this;
    }
    
    /**
     * Type the given keys using keyboard.
     *
     * @param  string|array<int, string>  $keys
     * @return $this
     */
    public function type($keys, $options = [])
    {
        if (is_array($keys)) {
            $keys = join('', $keys);
        }
        
        $this->keyboard->type($keys, $options);
        
        return $this;
    }
    
    /**
     * Pause for the given amount of milliseconds.
     *
     * @param  int  $milliseconds
     * @return $this
     */
    public function pause($milliseconds)
    {
        $this->browser->pause($milliseconds);
        
        return $this;
    }
    
    /**
     * Dynamically call a method on the keyboard.
     *
     * @param  string  $method
     * @param  array  $parameters
     * @return mixed
     *
     * @throws \BadMethodCallException
     */
    public function __call($method, $parameters)
    {
        if (static::hasMacro($method)) {
            return $this->macroCall($method, $parameters);
        }
        
        throw new BadMethodCallException("Call to undefined keyboard method [{$method}].");
    }
}
