<?php

namespace Puth\Laravel\Browser\Concerns;

use Closure;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/WaitsForElements.php
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
trait WaitsForElements
{
    /**
     * Execute the given callback in a scoped browser once the selector is available.
     *
     * @param string $selector
     * @param \Closure $callback
     * @param int|null $seconds
     * @return $this
     */
    public function whenAvailable($selector, Closure $callback, $seconds = null)
    {
        return $this->waitFor($selector, $seconds)->with($selector, $callback);
    }
    
    /**
     * Wait for the given selector to become visible.
     *
     * @param string $selector
     * @param int|null $seconds
     * @return $this
     */
    public function waitFor($selector, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for selector', $selector);
        
        return $this->waitUsing($seconds, 100, function () use ($selector) {
            return $this->resolver->findOrFail($selector)->visible();
        }, $message);
    }
    
    /**
     * Wait for the given selector to be removed.
     *
     * @param string $selector
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilMissing($selector, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for removal of selector', $selector);
        
        return $this->waitUsing($seconds, 100, function () use ($selector) {
            try {
                $missing = !$this->resolver->findOrFail($selector)->visible();
            } catch (\Exception $e) {
                $missing = true;
            }
            
            return $missing;
        }, $message);
    }
    
    /**
     * Wait for the given text to be removed.
     *
     * @param string $text
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilMissingText($text, $seconds = null)
    {
        $text = Arr::wrap($text);
        
        $message = $this->formatTimeOutMessage('Waited %s seconds for removal of text', implode("', '", $text));
        
        return $this->waitUsing($seconds, 100, function () use ($text) {
            return !Str::contains($this->resolver->findOrFail('')->innerText, $text);
        }, $message);
    }
    
    /**
     * Wait for the given text to become visible.
     *
     * @param array|string $text
     * @param int|null $seconds
     * @return $this
     */
    public function waitForText($text, $seconds = null, $ignoreCase = false)
    {
        $text = Arr::wrap($text);
        
        $message = $this->formatTimeOutMessage('Waited %s seconds for text', implode("', '", $text));
        
        return $this->waitUsing($seconds, 100, function () use ($text, $ignoreCase) {
            return Str::contains($this->resolver->findOrFail('')->innerText, $text, $ignoreCase);
        }, $message);
    }
    
    /**
     * Wait for the given text to become visible inside the given selector.
     *
     * @param string $selector
     * @param array|string $text
     * @param int|null $seconds
     * @return $this
     */
    public function waitForTextIn($selector, $text, $seconds = null, $ignoreCase = false)
    {
        $message = 'Waited %s seconds for text "' . $text . '" in selector ' . $selector;
        
        return $this->waitUsing($seconds, 100, function () use ($selector, $text, $ignoreCase) {
            return $this->assertSeeIn($selector, $text, $ignoreCase);
        }, $message);
    }
    
    /**
     * Wait for the given link to become visible.
     *
     * @param string $link
     * @param int|null $seconds
     * @return $this
     */
    public function waitForLink($link, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for link', $link);
        
        return $this->waitUsing($seconds, 100, function () use ($link) {
            return $this->seeLink($link);
        }, $message);
    }
    
    /**
     * Wait for an input field to become visible.
     *
     * @param string $field
     * @param int|null $seconds
     * @return $this
     */
    public function waitForInput($field, $seconds = null)
    {
        return $this->waitFor("input[name='{$field}'], textarea[name='{$field}'], select[name='{$field}']", $seconds);
    }
    
    /**
     * Wait for the given location.
     *
     * @param string $path
     * @param int|null $seconds
     * @return $this
     */
    public function waitForLocation($path, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for location', $path);
        
        return Str::startsWith($path, ['http://', 'https://'])
            ? $this->waitUntil('`${location.protocol}//${location.host}${location.pathname}` == \'' . $path . '\'', $seconds, $message)
            : $this->waitUntil("window.location.pathname == '{$path}'", $seconds, $message);
    }
    
    /**
     * Wait for the given location using a named route.
     *
     * @param string $route
     * @param array $parameters
     * @param int|null $seconds
     * @return $this
     */
    public function waitForRoute($route, $parameters = [], $seconds = null)
    {
        return $this->waitForLocation(route($route, $parameters, false), $seconds);
    }
    
    /**
     * Wait until an element is enabled.
     *
     * @param string $selector
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilEnabled($selector, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for element to be enabled', $selector);
        
        $this->waitUsing($seconds, 100, function () use ($selector) {
            return !$this->resolver->findOrFail($selector)->disabled;
        }, $message);
        
        return $this;
    }
    
    /**
     * Wait until an element is disabled.
     *
     * @param string $selector
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilDisabled($selector, $seconds = null)
    {
        $message = $this->formatTimeOutMessage('Waited %s seconds for element to be disabled', $selector);
        
        $this->waitUsing($seconds, 100, function () use ($selector) {
            return $this->resolver->findOrFail($selector)->disabled;
        }, $message);
        
        return $this;
    }
    
    /**
     * Wait until the given script returns true.
     *
     * @param string $script
     * @param int|null $seconds
     * @param string|null $message
     * @return $this
     */
    public function waitUntil($script, $seconds = null, $message = null)
    {
        if (!Str::endsWith($script, ';')) {
            $script = $script . ';';
        }
        
        return $this->waitUsing($seconds, 100, function () use ($script) {
            return $this->site->evaluate($script);
        }, $message);
    }
    
    /**
     * Wait until the Vue component's attribute at the given key has the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilVue($key, $value, $componentSelector = null, $seconds = null)
    {
        $this->waitUsing($seconds, 100, function () use ($key, $value, $componentSelector) {
            return $value == $this->vueAttribute($componentSelector, $key);
        });
        
        return $this;
    }
    
    /**
     * Wait until the Vue component's attribute at the given key does not have the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @param int|null $seconds
     * @return $this
     */
    public function waitUntilVueIsNot($key, $value, $componentSelector = null, $seconds = null)
    {
        $this->waitUsing($seconds, 100, function () use ($key, $value, $componentSelector) {
            return $value != $this->vueAttribute($componentSelector, $key);
        });
        
        return $this;
    }
    
    /**
     * Wait for a JavaScript dialog to open.
     *
     * @param int|null $seconds
     * @return $this
     */
    public function waitForDialog($seconds = 15) // TODO let puth context handle timeout
    {
        $this->site->waitForDialog(['timeout' => $seconds * 1000]);
        
        return $this;
    }
    
    /**
     * Wait for the current page to reload.
     *
     * @param \Closure|null $callback
     * @param int|null $seconds
     * @return $this
     */
    public function waitForReload($callback = null, $seconds = null)
    {
        $token = Str::random();
        
        $this->site->evaluate("window['{$token}'] = {};");
        
        if ($callback) {
            $callback($this);
        }
        
        return $this->waitUsing($seconds, 100, function () use ($token) {
            return $this->site->evaluate("typeof window['{$token}'] === 'undefined';");
        }, 'Waited %s seconds for page reload.');
    }
    
    /**
     * Click an element and wait for the page to reload.
     *
     * @param string|null $selector
     * @param int|null $seconds
     * @return $this
     */
    public function clickAndWaitForReload($selector = null, $seconds = null)
    {
        return $this->waitForReload(function ($browser) use ($selector) {
            $browser->click($selector);
        }, $seconds);
    }
    
    /**
     * Wait for the given event type to occur on a target.
     *
     * @param string $type
     * @param string|null $target
     * @param int|null $seconds
     * @return $this
     */
    public function waitForEvent($type, $target = '', $seconds = null)
    {
        $seconds = $seconds === null ? static::$waitSeconds : $seconds;
        $timeout = "setTimeout(resolve, {$seconds}000);";
        
        if ($target !== 'document' && $target !== 'window') {
            $this->resolver->findOrFail($target)
                ->evaluate("element => (new Promise(function (resolve, reject) { $timeout element.addEventListener('$type', resolve, { once: true }); }))");
        } else {
            $this->site->evaluate("(new Promise(function (resolve, reject) { $timeout $target.addEventListener('$type', resolve, { once: true }); }))");
        }

        return $this;
    }
    
    /**
     * Wait for the given callback to be true.
     *
     * @param int|null $seconds
     * @param int $interval
     * @param \Closure $callback
     * @param string|null $message
     * @return $this
     */
    public function waitUsing($seconds, $interval, Closure $callback, $message = null)
    {
        $seconds = is_null($seconds) ? static::$waitSeconds : $seconds;
        
        $this->pause($interval);
        
        $started = Carbon::now();
        
        while (true) {
            try {
                if ($callback()) {
                    break;
                }
            } catch (\Exception $e) {
                //
            }
            
            if ($started->lt(Carbon::now()->subSeconds($seconds))) {
                throw new \Exception($message
                    ? sprintf($message, $seconds)
                    : "Waited {$seconds} seconds for callback."
                );
            }
            
            $this->pause($interval);
        }
        
        return $this;
    }
    
    /**
     * Prepare custom TimeOutException message for sprintf().
     *
     * @param string $message
     * @param string $expected
     * @return string
     */
    protected function formatTimeOutMessage($message, $expected)
    {
        return $message.' ['.$this->escapePercentCharacters($expected).'].';
    }
    
    /**
     * Escape percent characters in preparation for sending the given message to "sprintf".
     *
     * @param  string  $message
     * @return string
     */
    protected function escapePercentCharacters($message)
    {
        return str_replace('%', '%%', $message);
    }
}
