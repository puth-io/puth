---
title: Waiting and sync
description: Timeouts and wait helpers.
---

# Waiting and sync

Wait for a specific result when an interaction starts an asynchronous update. This keeps a test tied to application state instead of a fixed delay:

```php
$browser->press('Save');
$browser->waitForTextIn('#status', 'Saved');
```

## Timeouts

Browser wait timeouts are in milliseconds. The default Browser timeout is 3000 ms.

- `$browser->setTimeout(ms)` sets the base timeout used by wait helpers.
- `$browser->setTimeoutMultiplier(factor)` scales explicit timeouts in helpers that use the Browser timeout resolver. It applies to this Browser instance, not every browser.

```php
$browser->setTimeout(5000)->setTimeoutMultiplier(2);
```

## Element waits

A hidden element can still exist in the DOM. Use `$browser->waitUntilMissing()` when it only needs to disappear from view; use `$browser->waitForNotPresent()` when it must be removed entirely.

- `$browser->waitFor(selector, timeout?)` waits for visible.
- `$browser->waitUntilMissing(selector, timeout?)` waits for hidden.
- `$browser->waitForNotPresent(selector, options?)` waits until not in DOM.
- `$browser->waitForText(text, timeout?, ignoreCase?)` waits for text anywhere.
- `$browser->waitForTextIn(selector, text, timeout?, ignoreCase?)` waits for text in a selector.
- `$browser->waitUntilMissingText(text, timeout?, ignoreCase?)` waits for text to disappear.
- `$browser->waitUntilMissingTextIn(selector, text, timeout?, ignoreCase?)` waits for text to disappear in a selector.

```php
$browser->waitFor('[puth="toast"]');
$browser->waitUntilMissing('[puth="toast"]');
```

Use CSS selectors for `$browser->waitFor()` and `$browser->waitUntilMissing()`: these server helpers pass selectors directly to Puppeteer. Unlike `$browser->click()` and `$browser->waitForTextIn()`, they do not expand `@` shortcuts or apply the resolver prefix. Attribute and enabled/disabled waits also need CSS selectors.

## Other waits

- `$browser->waitForLink(href, timeout?)` waits for a link with matching `href`.
- `$browser->waitForInput(name, timeout?)` waits for input/select/textarea by name.
- `$browser->waitForLocation(url, timeout?)` waits until the URL matches.
- `$browser->waitForEvent(type, target?, timeout?)` waits for a DOM event.

```php
$browser->waitForLocation('/checkout');
```

## Custom waits

The generated PHP client exposes the server’s wait helper as `$browser->_waitUntil()`. Use it to pass arguments and explicit Puppeteer options. It waits until the page function returns a truthy value:

```php
$browser->_waitUntil(
    '() => window.__booted === true',
    [],
    'App did not boot in time',
    ['timeout' => 5000],
);
```

<SdkContent sdk="laravel">

Laravel also provides `$browser->waitUntil($script, $seconds, $message)`. Its wrapper signature differs from `$browser->_waitUntil($pageFunction, $args, $message, $options)` above. Use the underscored form when passing explicit Puppeteer options.

</SdkContent>

Other server helpers (see the [Browser reference](/api/browser)):

- `$browser->_waitUntil(pageFunction, args?, message?, options?)`
- `$browser->waitUntilAttribute(selector, attribute, value, message, options?)`
- `$browser->waitUntilEnabled(selector, options?)`
- `$browser->waitUntilDisabled(selector, options?)`
