---
title: Assertions
description: Check navigation, page content, form state and element visibility.
---

# Assertions

Assertions check browser state and fail the test when the result differs from what you expect. The server supplies assertion helpers through both clients. Assertion failures are reported as exceptions to the test process.

<SdkContent sdk="php">

The PHP client currently expects a bound Laravel test case when processing assertion metadata. The signatures below describe its generated API, but standalone tests should check returned values in PHP until that client limitation is resolved. See [standalone setup](./getting-started#connect-a-client).

</SdkContent>

## Check navigation

```php
$browser->visit('https://app.test/settings');
$browser->assertTitleContains('Settings');
$browser->assertPathIs('/settings');
```

Use `$browser->assertTitle()` for an exact title match and `$browser->assertTitleContains()` for a partial match. URL helpers let you check the path, host, scheme, port, query parameters or fragment independently.

```php
$browser->assertPathIs('/orders');
$browser->assertQueryStringHas('status', 'open');
```

`$browser->assertUrlIs()` accepts a full URL or a path. A full URL without a query string can match a page that has query parameters, so assert those parameters separately when they matter.

## Check content

Use `$browser->assertSee()` for page text and `$browser->assertSeeIn()` to limit the check to a particular element:

```php
$browser->assertSee('Dashboard');
$browser->assertSeeIn('#account-menu', 'Sign out');
$browser->assertDontSeeIn('#alerts', 'Payment failed');
```

Use `$browser->assertSourceHas()` for HTML source and `$browser->assertScript(expression, expected)` for a JavaScript result. If content loads asynchronously, see [waiting and sync](./waiting-and-sync).

## Check form state

```php
$browser->type('email', 'you@example.com');
$browser->check('terms');
$browser->select('country', 'US');
$browser->assertInputValue('email', 'you@example.com');
$browser->assertChecked('terms');
$browser->assertSelected('country', 'US');
```

Other helpers check radio selections, available select options, enabled or disabled buttons, and focused fields. See the [Browser reference](/api/browser#assertions) for the method list.

## Visibility and presence

These checks answer different questions:

| Assertion | Expected state |
| --- | --- |
| `$browser->assertVisible(selector)` | The element is visible. |
| `$browser->assertMissing(selector)` | The element is hidden or absent. |
| `$browser->assertPresent(selector)` | The element exists, including when hidden. |
| `$browser->assertNotPresent(selector)` | The element does not exist in the DOM. |

Use presence checks when an element's existence matters independently of its display state.

## Links and cookies

`$browser->assertSeeLink(href)` and `$browser->assertDontSeeLink(href)` check a link by its `href`. `$browser->clickLink(text)` uses visible link text instead.

For cookies, use the [cookie assertions](./cookies#check-a-cookie) documented for the selected client.

For attribute checks, Vue state assertions and the remaining helpers, see the [Browser reference](/api/browser#assertions).
