<?php

namespace Puth\Laravel\Concerns;

use PHPUnit\Framework\Assert;

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
