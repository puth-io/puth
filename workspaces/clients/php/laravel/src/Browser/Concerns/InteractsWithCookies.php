<?php

namespace Puth\Laravel\Browser\Concerns;

use DateTimeInterface;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Support\Facades\Crypt;

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