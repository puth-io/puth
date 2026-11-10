---
title: Waiting and sync
description: Timeouts and wait helpers.
sdks: [java, js]
---

# Waiting and sync

Wait for a specific result when an interaction starts an asynchronous update. This keeps a test tied to application state instead of a fixed delay:

```php
$browser->press('Save');
$browser->waitForTextIn('#status', 'Saved');
```
```java
browser.press("Save");
browser.waitForTextIn("#status", "Saved");
```
```ts
await browser.press('Save')
    .waitForTextIn('#status', 'Saved');
```

## Automatic waiting

Most waiting happens without asking for it, following the model of [Cypress](https://docs.cypress.io/app/core-concepts/retry-ability).

- **Assertions and waits** run again until they pass or their timeout runs out.
- **Reads** such as `text()` and `attribute()` run again when the page changes under them.
- **Actions** such as `click()` and `type()` wait until their element is visible, enabled, attached, not moving and not covered, and for typing also not readonly. If it never gets there, the error says why, for example `Element [#save] is not actionable: it is covered by <div#modal>`. An action is never repeated once it reached the page, because that could submit a form twice.
- **Page loads** pause calls until the next document loaded, for up to `timeouts.pageLoad` milliseconds (30000 by default).

An action succeeds even if the page closes because of it. Work that could not happen because the page closed fails with `PageClosed`.

A page can announce a navigation just after the action that caused it returned, for example after a submitted form. Before the next call that does not retry on its own, Puth therefore checks with the page once, which takes well under a millisecond, and then pauses for the page load. A navigation that starts later, from a timer or after a request finished, cannot be detected this way. Follow such an action with a wait or an assertion for the next page:

```php
$browser->press('Continue')->assertPathIs('/next')->type('name', 'Puth');
```
```java
browser.press("Continue").assertPathIs("/next").type("name", "Puth");
```
```ts
await browser.press('Continue').assertPathIs('/next').type('name', 'Puth');
```

`timeouts.actionSettle` additionally holds back that call for the given milliseconds after an action, `0` by default. Both timeouts are context options:

```php
$context = \Puth\Context::create('http://127.0.0.1:7345', ['timeouts' => ['actionSettle' => 50]]);
```
```java
Context context = Context.create("http://127.0.0.1:7345", Map.of("timeouts", Map.of("actionSettle", 50)));
```
```ts
const context = await Context.create('http://127.0.0.1:7345', { timeouts: { actionSettle: 50 } });
```

Pass `force` to `click` to skip the checks, or set the `actionability` Browser option to `false` to skip them for a whole Browser.

## Timeouts

Browser wait timeouts are in milliseconds. The default Browser timeout is 3000 ms.

- `$browser->setTimeout(ms)` sets the base timeout used by wait helpers.
- `$browser->setTimeoutMultiplier(factor)` scales explicit timeouts in helpers that use the Browser timeout resolver. It applies to this Browser instance, not every browser.

```php
$browser->setTimeout(5000)->setTimeoutMultiplier(2);
```
```java
browser.setTimeout(5000).setTimeoutMultiplier(2);
```
```ts
await browser.setTimeout(5000).setTimeoutMultiplier(2);
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
```java
browser.waitFor("[puth=\"toast\"]");
browser.waitUntilMissing("[puth=\"toast\"]");
```
```ts
await browser.waitFor('[puth="toast"]')
    .waitUntilMissing('[puth="toast"]');
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
```java
browser.waitForLocation("/checkout");
```
```ts
await browser.waitForLocation('/checkout');
```

## Custom waits

The clients expose the server’s wait helper as `$browser->_waitUntil()`. Use it to pass arguments and explicit Puppeteer options. It waits until the page function returns a truthy value:

```php
$browser->_waitUntil(
    '() => window.__booted === true',
    [],
    'App did not boot in time',
    ['timeout' => 5000],
);
```
```java
browser.waitUntil(
    "() => window.__booted === true",
    new Object[]{},
    "App did not boot in time",
    Map.of("timeout", 5000)
);
```
```ts
await browser.waitUntil(
    '() => window.__booted === true',
    [],
    'App did not boot in time',
    { timeout: 5000 },
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
