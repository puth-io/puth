<?php

namespace Puth\Laravel\Browser\Concerns;

use Closure;
use Illuminate\Support\Collection;
use PHPUnit\Runner\Version;
use Puth\Laravel\Browser\Browser;
use ReflectionFunction;
use Throwable;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/ProvidesBrowser.php
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
trait ProvidesBrowser
{
    /**
     * All of the active browser instances.
     *
     * @var Collection
     */
    protected static $browsers = [];
    
    /**
     * The callbacks that should be run on class tear down.
     *
     * @var array
     */
    protected static $afterClassCallbacks = [];
    
    public bool|string $headless = 'new';
    
    /**
     * Register an "after class" tear down callback.
     *
     * @param \Closure $callback
     * @return void
     */
    public static function afterClass(Closure $callback)
    {
        static::$afterClassCallbacks[] = $callback;
    }
    
    /**
     * Create a new browser instance.
     */
    public function browse(Closure $callback)
    {
        $browsers = $this->createBrowsersFor($callback);
        
        try {
            $callback(...$browsers->all());
        } catch (\Exception $e) {
            $this->captureFailuresFor($browsers);
            $this->storeSourceLogsFor($browsers);
            
            throw $e;
        } catch (Throwable $e) {
            $this->captureFailuresFor($browsers);
            $this->storeSourceLogsFor($browsers);
            
            throw $e;
        } finally {
            $this->storeConsoleLogsFor($browsers);
            static::$browsers = $this->closeAllButPrimary($browsers);
        }
    }
    
    /**
     * Create the browser instances needed for the given callback.
     *
     * @param \Closure $callback
     * @return array
     *
     * @throws \ReflectionException
     */
    protected function createBrowsersFor(Closure $callback)
    {
        if (count(static::$browsers) === 0) {
            static::$browsers = collect([$this->newBrowser()]);
        }
        
        $additional = $this->browsersNeededFor($callback) - 1;
        
        for ($i = 0; $i < $additional; $i++) {
            static::$browsers->push($this->newBrowser());
        }
        
        return static::$browsers;
    }
    
    /**
     * Create a new Browser instance.
     */
    protected function newBrowser()
    {
        $browser = $this->context->createBrowser(array_merge([
            'defaultViewport' => [
                'width' => 1280,
                'height' => 720,
            ],
            'headless' => $this->headless,
        ], $this->getLaunchOptions()));
        
        return new Browser(
            $this->context,
            $browser,
            $browser->pages()[0],
            options: [
                'legacyBrowserHandling' => $this->legacyBrowserHandling ?? false,
            ],
        );
    }
    
    /**
     * Get the number of browsers needed for a given callback.
     *
     * @param \Closure $callback
     * @return int
     *
     * @throws \ReflectionException
     */
    protected function browsersNeededFor(Closure $callback)
    {
        return (new ReflectionFunction($callback))->getNumberOfParameters();
    }
    
    /**
     * Capture failure screenshots for each browser.
     *
     * @param \Illuminate\Support\Collection $browsers
     * @return void
     */
    protected function captureFailuresFor($browsers)
    {
        $browsers->each(function (Browser $browser, $key) {
            $fullPageScreenshot = property_exists($browser, 'fitOnFailure') && $browser->fitOnFailure;
            
            $name = $this->getCallerName();
            
            $browser->screenshot('failure-' . $name . '-' . $key, [
                'fullPage' => $fullPageScreenshot,
            ]);
        });
    }
    
    /**
     * Store the console output for the given browsers.
     *
     * @param \Illuminate\Support\Collection $browsers
     * @return void
     */
    protected function storeConsoleLogsFor($browsers)
    {
        $browsers->each(function (Browser $browser, $key) {
            $name = $this->getCallerName();
            
            $browser->storeConsoleLog($name . '-' . $key);
        });
    }

    /**
     * Store the source code for the given browsers (if necessary).
     *
     * @param \Illuminate\Support\Collection $browsers
     * @return void
     */
    protected function storeSourceLogsFor($browsers)
    {
        $browsers->each(function ($browser, $key) {
            if (property_exists($browser, 'madeSourceAssertion') &&
                $browser->madeSourceAssertion) {
                $browser->storeSource($this->getCallerName() . '-' . $key);
            }
        });
    }
    
    /**
     * Close all of the browsers except the primary (first) one.
     *
     * @param \Illuminate\Support\Collection $browsers
     * @return \Illuminate\Support\Collection
     */
    protected function closeAllButPrimary($browsers)
    {
        $browsers->slice(1)->each->quit();
        
        return $browsers->take(1);
    }
    
    /**
     * Close all of the active browsers.
     *
     * @return void
     */
    public static function closeAll()
    {
        Collection::make(static::$browsers)->each->quit();
        
        static::$browsers = collect();
    }
    
    /**
     * Get the browser caller name.
     *
     * @return string
     */
    protected function getCallerName()
    {
        $name = version_compare(Version::id(), '10', '>=')
            ? $this->name()
            : $this->getName(false);
        
        return str_replace('\\', '_', get_class($this)) . '_' . $name;
    }
    
    public function getLaunchOptions(): array
    {
        return [];
    }
}
