<?php

namespace Puth\Laravel\Concerns;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use PHPUnit\Framework\Assert;
use Puth\GenericObject;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthUtils;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/MakesAssertions.php
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
trait MakesAssertions
{
    /**
     * Assert that the given encrypted cookie is present.
     *
     * @param string $name
     * @param bool $decrypt
     * @return $this
     */
    public function assertHasCookie($name, $decrypt = true)
    {
        $cookie = $decrypt ? $this->cookie($name) : $this->plainCookie($name);

        Assert::assertTrue(
            !is_null($cookie),
            "Did not find expected cookie [{$name}]."
        );

        return $this;
    }

     /**
      * Assert that the given unencrypted cookie is present.
      *
      * @param string $name
      * @return $this
      */
     public function assertHasPlainCookie($name)
     {
         return $this->_assertHasCookie($name);
     }

    /**
     * Assert that the given encrypted cookie is not present.
     *
     * @param string $name
     * @param bool $decrypt
     * @return $this
     */
    public function assertCookieMissing($name, $decrypt = true)
    {
        $cookie = $decrypt ? $this->cookie($name) : $this->plainCookie($name);

        Assert::assertTrue(
            is_null($cookie),
            "Found unexpected cookie [{$name}]."
        );

        return $this;
    }

     /**
      * Assert that the given unencrypted cookie is not present.
      *
      * @param string $name
      * @return $this
      */
     public function assertPlainCookieMissing($name)
     {
         return $this->_assertCookieMissing($name);
     }

    /**
     * Assert that an encrypted cookie has a given value.
     *
     * @param string $name
     * @param string $value
     * @return $this
     */
    public function assertCookieValue($name, $value, $decrypt = true)
    {
        $actual = $decrypt ? $this->cookie($name) : $this->plainCookie($name);

        Assert::assertEquals(
            $value, $actual,
            "Cookie [{$name}] had value [{$actual}], but expected [{$value}]."
        );

        return $this;
    }

     /**
      * Assert that an unencrypted cookie has a given value.
      *
      * @param string $name
      * @param string $value
      * @return $this
      */
     public function assertPlainCookieValue($name, $value)
     {
         return $this->_assertCookieValue($name, $value);
     }
}
