---
title: Laravel cookies
description: Encrypted cookies and Laravel's plain-cookie wrappers.
sdk: laravel
---

# Laravel cookies

The Laravel integration adds cookie helpers that use your application's encryption key. These wrappers are separate from [Puth's raw cookie API](./cookies).

## Choose the appropriate helper

| Task | Encrypted cookie | Plain cookie |
| --- | --- | --- |
| Read | `$browser->cookie($name)` | `$browser->plainCookie($name)` |
| Write | `$browser->cookie($name, $value)` | `$browser->plainCookie($name, $value)` |
| Assert presence | `$browser->assertHasCookie($name)` | `$browser->assertHasPlainCookie($name)` |
| Assert value | `$browser->assertCookieValue($name, $value)` | `$browser->assertPlainCookieValue($name, $value)` |
| Assert absence | `$browser->assertCookieMissing($name)` | `$browser->assertPlainCookieMissing($name)` |

Use encrypted helpers for cookies your Laravel application encrypts. Use plain helpers for unencrypted values, including values written directly with `$browser->setCookie()`.

## Read application cookies

```php
$browser->visit('https://app.test');
$value = $browser->cookie('application_setting');
$browser->assertCookieValue('application_setting', 'enabled');
```

The cookie must have been encrypted with the same application key the test uses. Puth's server does not provide Laravel encryption; it is handled by this client integration.
