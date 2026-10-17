---
title: Pages and elements
description: Page and ElementHandle methods supplied by the standard plugin.
---

# Pages and elements

The Browser shim is a high-level testing API. You can also access remote Puppeteer objects, including a Page and its ElementHandles. Puth's standard plugin extends these objects; a method registered on a Page or ElementHandle is not automatically a Browser shim method.

## Get the page or an element

The Browser's `page` property exposes its underlying Page. The PHP client's `$page->get()` is an alias for Puppeteer's element lookup:

```php
$page = $browser->page;
$element = $page->get('#email');
if ($element === null) {
    throw new \RuntimeException('Email field not found.');
}
$element->type('you@example.com');
```

These lower-level lookups use Puppeteer selectors. They do not apply the Browser shim's resolver prefixes or `@` shortcuts. Element lookup can return null, so ensure the element exists before calling methods on it.

## Standard plugin extensions

These examples show which object receives the call:

| Object | Examples |
| --- | --- |
| Page | `$page->visit($url)`, `$page->window()`, `$page->document()`, `$page->focused()` |
| ElementHandle | `$element->clear()`, `$element->value()`, `$element->innerText()`, `$element->scrollIntoView()` |
| Keyboard | `$keyboard->press($key)`, `$keyboard->down($key)`, `$keyboard->up($key)` |

The plugin also exposes helpers such as `$element->children()`, `$element->siblings()` and `$element->tagName()`. These are remote object calls, separate from similarly named Browser methods.

For most browser tests, start with the [Browser API](./browser). Use remote objects when you need direct access to a page, element or keyboard behavior that the shim does not expose.
