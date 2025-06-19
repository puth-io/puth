<?php

namespace Puth\Laravel\Concerns;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\Constraint\RegularExpression;
use Puth\Traits\PuthUtils;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/MakesUrlAssertions.php
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
trait MakesUrlAssertions
{
    use PuthUtils;

    /**
     * Assert that the current URL path matches the given route.
     *
     * @param string $route
     * @param array $parameters
     * @return $this
     */
    public function assertRouteIs($route, $parameters = [])
    {
        return $this->assertPathIs(route($route, $parameters, false));
    }
    
    /**
     * Assert that a query string parameter is present and has a given value.
     *
     * @param string $name
     * @param string $value
     * @return $this
     */
    public function assertQueryStringHas($name, $value = null)
    {
        $output = $this->assertHasQueryStringParameter($name);
        
        if (is_null($value)) {
            return $this;
        }
        
        $parsedOutputName = is_array($output[$name]) ? implode(',', $output[$name]) : $output[$name];
        
        $parsedValue = is_array($value) ? implode(',', $value) : $value;
        
        Assert::assertEquals(
            $value, $output[$name],
            "Query string parameter [{$name}] had value [{$parsedOutputName}], but expected [{$parsedValue}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given query string parameter is missing.
     *
     * @param string $name
     * @return $this
     */
    public function assertQueryStringMissing($name)
    {
        $parsedUrl = parse_url($this->url());
        
        if (!array_key_exists('query', $parsedUrl)) {
            Assert::assertTrue(true);
            
            return $this;
        }
        
        parse_str($parsedUrl['query'], $output);
        
        Assert::assertArrayNotHasKey(
            $name, $output,
            "Found unexpected query string parameter [{$name}] in [" . $this->url() . '].'
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment matches the given pattern.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentIs($fragment)
    {
        $pattern = preg_quote($fragment, '/');
        
        $actualFragment = (string)parse_url($this->site->evaluate('window.location.href'), PHP_URL_FRAGMENT);
        
        Assert::assertThat(
            $actualFragment, new RegularExpression('/^' . str_replace('\*', '.*', $pattern) . '$/u'),
            "Actual fragment [{$actualFragment}] does not equal expected fragment [{$fragment}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment begins with given fragment.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentBeginsWith($fragment)
    {
        $actualFragment = (string)parse_url($this->site->evaluate('window.location.href'), PHP_URL_FRAGMENT);
        
        Assert::assertStringStartsWith(
            $fragment, $actualFragment,
            "Actual fragment [$actualFragment] does not begin with expected fragment [$fragment]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment does not match the given fragment.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentIsNot($fragment)
    {
        $actualFragment = (string)parse_url($this->site->evaluate('window.location.href'), PHP_URL_FRAGMENT);
        
        Assert::assertNotEquals(
            $fragment, $actualFragment,
            "Fragment [{$fragment}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given query string parameter is present.
     *
     * @param string $name
     * @return array
     */
    public function assertHasQueryStringParameter($name)
    {
        $parsedUrl = parse_url($this->url());
        
        Assert::assertArrayHasKey(
            'query', $parsedUrl,
            'Did not see expected query string in [' . $this->url() . '].'
        );
        
        parse_str($parsedUrl['query'], $output);
        
        Assert::assertArrayHasKey(
            $name, $output,
            "Did not see expected query string parameter [{$name}] in [" . $this->url() . '].'
        );
        
        return $output;
    }
}
