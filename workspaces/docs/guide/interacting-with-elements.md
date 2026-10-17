---
title: Interacting with elements
description: Click, type, select, drag, and hover.
---

# Interacting with elements

Use Browser methods to interact with page elements. Create a Browser through the [selected client setup](./getting-started#connect-a-client). Examples below use CSS selectors, field names and `@` shortcuts; see [selectors and resolvers](./selectors-and-resolvers) for how each is resolved.

## Clicking

- `$browser->click(selector?)` clicks the element or the current mouse position.
- `$browser->clickLink(text, element? = 'a')` clicks a link by its visible text.
- `$browser->clickAtPoint(x, y)` clicks absolute coordinates.
- `$browser->clickAtXPath(expression)` clicks using XPath.
- `$browser->clickAndHold(selector?)`, `$browser->doubleClick(selector?)`, `$browser->rightClick(selector?)`, `$browser->controlClick(selector?)`.
- `$browser->releaseMouse()` releases the mouse button.

```php
$browser->click('@save');
$browser->rightClick('#menu');
```

`$browser->moveMouse(xOffset, yOffset)` is not supported.

## Typing and values

Use these for inputs and content:

- `$browser->type(selector, value)` clears and types.
- `$browser->typeSlowly(selector, value, pause?)` types with delay.
- `$browser->append(selector, value)` types without clearing.
- `$browser->appendSlowly(selector, value, pause?)` appends with delay.
- `$browser->clear(selector)` clears an input.
- <SdkCall php="$browser-&gt;_keys($selector, $keys = [])" laravel="$browser-&gt;keys($selector, ...$keys)" /> sends key input. Key names use the case-sensitive [Puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput).
- `$browser->value(selector, value?)` gets or sets the value.
- `$browser->text(selector)` returns `innerText`.
- `$browser->attribute(selector, attribute)` reads an attribute.

<SdkContent sdk="laravel">

```php
$browser->type('password', 'secretx');
$browser->keys('#password', '{Backspace}');
```

</SdkContent>

<SdkContent sdk="php">

```php
$browser->type('password', 'secretx');
$browser->_keys('#password', ['{Backspace}']);
```

</SdkContent>

Wrap special keys in braces, for example `{Backspace}` or `{Enter}`. A bare string such as `Backspace` types that word. Multiple arguments are sent in sequence; combine modifiers and keys in one string, such as `{Control}{a}`.

## Forms

- `$browser->select(selector, value?)` selects one or more options.
- `$browser->radio(selector, value)` selects a radio input.
- `$browser->check(selector, value?)` / `$browser->uncheck(selector, value?)` toggles checkboxes.

```php
$browser->select('country', 'US');
$browser->check('terms');
```

## Buttons

- `$browser->press(textOrName)` clicks a button by label or name.
- `$browser->pressAndWaitFor(textOrName)` clicks and waits for it to be enabled.

After submitting a form, wait for the result your application shows. A button becoming enabled does not necessarily mean navigation or rendering has finished:

```php
$browser->press('Save');
$browser->waitForText('Changes saved');
$browser->assertSee('Changes saved');
```

## Mouse and drag

- `$browser->mouseover(selector)` hovers an element.
- `$browser->scrollIntoView(selector)` / `$browser->scrollTo(selector)`.
- `$browser->clickablePoint(selector, offset?)` returns coordinates.
- `$browser->drag(from, to)` drags one element onto another.
- `$browser->dragOffset(selector, x, y)` drags by offset.
- `$browser->dragUp(selector, offset)` / `$browser->dragDown(selector, offset)` / `$browser->dragLeft(selector, offset)` / `$browser->dragRight(selector, offset)` convenience methods.
