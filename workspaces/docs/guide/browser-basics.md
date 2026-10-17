---
title: Browser basics
description: Navigate pages, inspect the current URL and work with frames.
---

# Browser basics

A Browser wraps a page or an iframe.

<SdkContent sdk="laravel">

Examples run inside a `$this->browse()` callback. Follow [Laravel setup](./laravel) for a complete test.

</SdkContent>

<SdkContent sdk="php">

Create `$context` with `new \Puth\Context($serverUrl)`, then use `$context->createBrowserShim()` to obtain `$browser`. See [Getting started](./getting-started#connect-a-client) for a complete example.

</SdkContent>

## Navigate a page

```php
$browser->visit('https://app.test');
$browser->clickLink('Settings');
$browser->waitForLocation('/settings');
$browser->assertTitleContains('Settings');
```

`$browser->refresh()` reloads the current page. `$browser->back()` and `$browser->forward()` navigate its history. Use `$browser->blank()` to load `about:blank`, or `$browser->setContent(html)` to replace the current document with HTML supplied by your test.

For application pages that update asynchronously, wait for the expected [URL, element or text](./waiting-and-sync) before continuing.

## Inspect the URL and page

Read the current address when your test needs to use it, such as checking a redirect destination or extracting a path:

| Method | Result for `https://app.test:8443/orders?status=open` |
| --- | --- |
| `$browser->url()` | `https://app.test:8443/orders?status=open` |
| `$browser->scheme()` | `https` |
| `$browser->host()` | `app.test` |
| `$browser->path()` | `/orders` |
| `$browser->port()` | `8443` |

For ordinary HTTP and HTTPS URLs without an explicit port, `$browser->port()` returns `80` or `443`. `$browser->title()` reads the document title and `$browser->content()` returns its HTML.

When you only need to check navigation, use an [assertion](./assertions) such as `$browser->assertPathIs('/orders')` instead of reading and comparing the path yourself.

## Set the viewport

Choose a viewport size to exercise responsive layouts:

```php
$browser->resize(390, 844);
$browser->visit('https://app.test');
$browser->assertVisible('#mobile-menu');
```

`$browser->viewport()` reads the current viewport. `$browser->maximize()`, `$browser->bounds()`, `$browser->setBounds()` and `$browser->move()` control the browser window. These helpers operate on pages, not iframe-scoped browsers.

## Work inside an iframe

<SdkContent sdk="laravel">

`$browser->withinFrame()` runs a callback scoped to an iframe, then lets you continue on the outer page:

```php
$browser->withinFrame('#checkout-frame', function ($frame) {
    $frame->click('#pay');
});
$browser->assertSee('Order');
```

</SdkContent>

<SdkContent sdk="php">

`$browser->_withinIframe()` returns a separate Browser wrapper scoped to the iframe. Keep the outer Browser to continue on the page:

```php
$frame = $browser->_withinIframe('#checkout-frame');
$frame->click('#pay');
$browser->assertSee('Order');
```

</SdkContent>

## Evaluate JavaScript

Use `$browser->evaluate()` to read state that is not exposed through an existing helper. Code runs in the browser page:

```php
$count = $browser->evaluate('document.querySelectorAll(".item").length');
```

## Browser lifecycle

<SdkContent sdk="laravel">

Laravel's test case creates browsers for `$this->browse()` callbacks and destroys the test context during teardown.

</SdkContent>

<SdkContent sdk="php">

Call `$browser->quit()` to close its browser context. When finished with the Puth test context, call `$context->destroy()` to release remaining resources. Use a `finally` block so cleanup runs after failures too.

</SdkContent>

`$browser->clone(site?, options?)` creates another wrapper around the same page or a supplied page/frame. It copies timeout settings; it does not open a new page or copy custom resolver settings.
