<?php

namespace Puth\Laravel\Concerns;

use DateTimeInterface;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Support\Facades\Crypt;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/InteractsWithCookies.php
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
trait InteractsWithCookies
{
     /**
      * Get or set an encrypted cookie's value.
      *
      * @param string $name
      * @param string|null $value
      * @param int|DateTimeInterface|null $expiry
      * @param array $options
      * @return $this|string
      */
     public function cookie($name, $value = null, $expiry = null, array $options = [])
     {
         if (!is_null($value)) {
             return $this->addCookie($name, $value, $expiry, $options);
         }
    
         $cookie = $this->site->getCookieByName($name);
    
         if ($cookie) {
             $decryptedValue = decrypt(rawurldecode($cookie->value), $unserialize = false);
    
             $hasValuePrefix = strpos($decryptedValue, CookieValuePrefix::create($name, Crypt::getKey())) === 0;
    
             return $hasValuePrefix ? CookieValuePrefix::remove($decryptedValue) : $decryptedValue;
         }
     }
    
    /**
     * Get or set an unencrypted cookie's value.
     *
     * @param string $name
     * @param string|null $value
     * @param int|DateTimeInterface|null $expiry
     * @param array $options
     * @return $this|string
     */
    public function plainCookie($name, $value = null, $expiry = null, array $options = [])
    {
        if (!is_null($value)) {
            return $this->addCookie($name, $value, $expiry, $options, false);
        }
        
        $cookie = $this->site->getCookieByName($name);
        
        if ($cookie) {
            return rawurldecode($cookie->value);
        }
    }
    
    /**
     * Add the given cookie.
     *
     * @param string $name
     * @param string $value
     * @param int|DateTimeInterface|null $expiry
     * @param array $options
     * @return $this
     */
    public function addCookie($name, $value, $expiry = null, array $options = [], $encrypt = true)
    {
         if ($encrypt) {
             $prefix = CookieValuePrefix::create($name, Crypt::getKey());
             
             $value = encrypt($prefix.$value, $serialize = false);
         }
        
        if ($expiry instanceof DateTimeInterface) {
            $expiry = $expiry->getTimestamp();
        }
        
        $this->site->setCookie(array_merge($options, compact('expiry', 'name', 'value')));
        
        return $this;
    }
    
    /**
     * Delete the given cookie.
     *
     * @param string $name
     * @return $this
     */
    public function deleteCookie($name)
    {
        $this->site->deleteCookie(['name' => $name]);
        
        return $this;
    }
}
