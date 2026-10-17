---
title: Cookies
description: Read, write and delete browser cookies with Puth.
---

# Cookies

Use cookies to set up browser state or check values written by your application. Puth's core cookie helpers operate on raw values and work on pages, not iframe-scoped browsers.

## Read and write cookies

Visit the target origin before reading its cookies. Pass an array of cookie definitions to `$browser->setCookie()`; include a URL or domain to identify where each cookie belongs.

```php
$browser->visit('https://app.test');
$browser->setCookie([
    ['name' => 'preference', 'value' => 'dark', 'url' => 'https://app.test'],
]);
$cookie = $browser->getCookieByName('preference');
```

`$browser->getCookieByName()` returns the cookie object when it exists. Inspect that object for its value, domain and path.

## Check a cookie

<SdkContent sdk="laravel">

Use Laravel's plain-cookie assertions for raw values set through `$browser->setCookie()`:

```php
$browser->assertHasPlainCookie('preference');
$browser->assertPlainCookieValue('preference', 'dark');
```

Laravel's encrypted-cookie helpers are described separately in [Laravel cookies](./laravel-cookies).

</SdkContent>

<SdkContent sdk="php">

The generated PHP API includes raw-cookie assertions. They currently share the [standalone assertion-binding limitation](./getting-started#connect-a-client); the calls below show their signatures:

```php
$browser->_assertHasCookie('preference');
$browser->_assertCookieValue('preference', 'dark');
```

These assertions do not encrypt or decrypt cookie values.

</SdkContent>

## Delete a cookie

Remove a cookie for the current page:

```php
$browser->deleteCookie('preference');
```

<SdkContent sdk="laravel">

```php
$browser->assertPlainCookieMissing('preference');
```

</SdkContent>

<SdkContent sdk="php">

```php
$browser->_assertCookieMissing('preference');
```

</SdkContent>

If a name exists under several domains or paths, pass cookie definitions with the matching domain/path to `$browser->deleteCookie()` instead of a name alone.
