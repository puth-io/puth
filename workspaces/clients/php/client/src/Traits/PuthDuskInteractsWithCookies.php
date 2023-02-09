<?php

namespace Puth\Traits;

use DateTimeInterface;

trait PuthDuskInteractsWithCookies
{
    // /**
    //  * Get or set an encrypted cookie's value.
    //  *
    //  * @param string $name
    //  * @param string|null $value
    //  * @param int|DateTimeInterface|null $expiry
    //  * @param array $options
    //  * @return string
    //  */
    // public function cookie($name, $value = null, $expiry = null, array $options = [])
    // {
    //     if (!is_null($value)) {
    //         return $this->addCookie($name, $value, $expiry, $options);
    //     }
    //
    //     $cookies = array_filter($this->page->cookies(), function ($cookie) use ($name) {
    //        return $cookie->name === $name;
    //     });
    //
    //     if (count($cookies) > 0) {
    //         $cookie = $cookies[0];
    //     } else {
    //         $cookie = null;
    //     }
    //
    //     if ($cookie) {
    //         $decryptedValue = decrypt(rawurldecode($cookie['value']), $unserialize = false);
    //
    //         $hasValuePrefix = strpos($decryptedValue, CookieValuePrefix::create($name, Crypt::getKey())) === 0;
    //
    //         return $hasValuePrefix ? CookieValuePrefix::remove($decryptedValue) : $decryptedValue;
    //     }
    // }
    
    /**
     * Get or set an unencrypted cookie's value.
     *
     * @param string $name
     * @param string|null $value
     * @param int|DateTimeInterface|null $expiry
     * @param array $options
     * @return string
     */
    public function plainCookie($name, $value = null, $expiry = null, array $options = [])
    {
        if (!is_null($value)) {
            return $this->addCookie($name, $value, $expiry, $options);
        }
    
        $cookies = array_filter($this->page->cookies(), function ($cookie) use ($name) {
            return $cookie->name === $name;
        });
    
        if (count($cookies) > 0) {
            $cookie = $cookies[0];
        } else {
            $cookie = null;
        }
        
        if ($cookie) {
            return rawurldecode($cookie['value']);
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
    public function addCookie($name, $value, $expiry = null, array $options = [])
    {
        // if ($encrypt) {
        //     $value = encrypt($value, $serialize = false);
        // }
        
        if ($expiry instanceof DateTimeInterface) {
            $expiry = $expiry->getTimestamp();
        }
        
        $this->page->setCookie(array_merge($options, compact('expiry', 'name', 'value')));
        
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
        $this->page->deleteCookie(['name' => $name]);
        
        return $this;
    }
}