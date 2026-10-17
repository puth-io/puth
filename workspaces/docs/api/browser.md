---
title: Browser
description: Browser shim methods and client naming differences.
---

# Browser

The calls below use the selected PHP client's names. For lower-level Page and ElementHandle methods, see [Pages and elements](./remote-objects). Default values are shown in signatures; examples in the [browser guides](/guide/browser-basics) show how to call them.

<SdkContent sdk="php">

Generated assertion methods currently expect a bound Laravel test case when processing assertion metadata. See [standalone setup](/guide/getting-started#connect-a-client) for that limitation and a runnable example using returned values.

</SdkContent>

## Setup and context

- `$browser->clone(site?, options?)` wrap the same or supplied target, copying timeout settings.
- `$browser->_withinIframe($selector)` returns a new Browser wrapper scoped to the iframe. The outer Browser stays unchanged.
- `$browser->setTimeout(ms)` set base timeout.
- `$browser->setTimeoutMultiplier(factor)` scale timeouts.
- `$browser->setResolverPrefix(prefix)` set selector scope.
- `$browser->setResolverPageElements(map)` define selector aliases.

## Navigation and page

- `$browser->visit(url)` navigate to a URL.
- `$browser->setContent(html, options?)` set document HTML.
- `$browser->blank()` load `about:blank`.
- `$browser->refresh(options?)` reload page.
- `$browser->back(options?)` and `$browser->forward(options?)` history navigation.
- `$browser->evaluate(pageFunction, args?)` run JS in page.
- `$browser->quit()` close browser context.

## Window and viewport

- `$browser->maximize()` enlarge window.
- `$browser->bounds()` read window size/position.
- `$browser->setBounds(bounds)` update window size/position.
- `$browser->resize(width, height)` change viewport size.
- `$browser->move(x, y)` move window.
- `$browser->viewport()` read viewport info.

## Page data

- `$browser->url()` full URL.
- `$browser->scheme()` http/https.
- `$browser->host()`, `$browser->path()`, `$browser->port()`.
- `$browser->title()` page title.
- `$browser->content()` page HTML.

## Cookies

- `$browser->getCookieByName(name)` get a cookie.
- `$browser->setCookie(cookies)` set cookies.
- `$browser->deleteCookie(cookiesOrName)` delete cookies.

## Screenshots

- <SdkCall php="$browser-&gt;_screenshot($options = [])" laravel="$browser-&gt;screenshot($name, $options = [])" /> capture a screenshot.
- `$browser->fitContent()` resize viewport to full page.
- `$browser->enableFitOnFailure()` / `$browser->disableFitOnFailure()`.

## Clicking and mouse

- `$browser->click(selector?)` click element or current position.
- `$browser->clickLink(text, element? = 'a')` click a link by visible text.
- `$browser->clickAtPoint(x, y)` click absolute coordinates.
- `$browser->clickAtXPath(expression)` click with XPath.
- `$browser->clickAndHold(selector?)` press mouse button.
- `$browser->doubleClick(selector?)`, `$browser->rightClick(selector?)`, `$browser->controlClick(selector?)`.
- `$browser->releaseMouse()` release mouse button.
- `$browser->moveMouse(xOffset, yOffset)` throws an unsupported-operation error.
- `$browser->mouseover(selector)` hover.
- `$browser->scrollIntoView(selector)` / `$browser->scrollTo(selector)`.
- `$browser->clickablePoint(selector, offset?)` get coordinates.

## Typing and values

- `$browser->value(selector, value?)` get or set value.
- `$browser->text(selector)` get text.
- `$browser->attribute(selector, attribute)` get attribute.
- `$browser->_type(selector, value, options?)` low-level typing helper.
- `$browser->type(selector, value)` clear then type.
- `$browser->typeSlowly(selector, value, pause?)` type with delay.
- `$browser->append(selector, value)` append text.
- `$browser->appendSlowly(selector, value, pause?)` append with delay.
- `$browser->clear(selector)` clear input.
- <SdkCall php="$browser-&gt;_keys($selector, $keys = [])" laravel="$browser-&gt;keys($selector, ...$keys)" /> send key combos.

## Forms and buttons

- `$browser->select(selector, value?)` select option(s).
- `$browser->radio(selector, value)` select radio.
- `$browser->_check(shouldBeChecked, selector, value?)` internal check helper.
- `$browser->check(selector, value?)` / `$browser->uncheck(selector, value?)`.
- `$browser->press(textOrName)` click a button by label/name.
- `$browser->pressAndWaitFor(textOrName)` click and wait for enabled.

## Drag helpers

- `$browser->drag(from, to)` drag element to target.
- `$browser->dragOffset(selector, x, y)` drag by offset.
- `$browser->dragUp(selector, offset)` / `$browser->dragDown(selector, offset)` / `$browser->dragLeft(selector, offset)` / `$browser->dragRight(selector, offset)`.

## Waiting

Timeouts use milliseconds. `$browser->waitFor()` and `$browser->waitUntilMissing()` take raw CSS selectors; they do not expand resolver shortcuts. See [waiting and sync](/guide/waiting-and-sync) for examples and PHP wrapper differences.

- `$browser->_waitFor(selector, options?)` internal wait helper.
- `$browser->waitFor(selector, timeout?)` wait for visible.
- `$browser->waitUntilMissing(selector, timeout?)` wait for hidden.
- `$browser->waitForLink(href, timeout?)` wait for a visible link with this href.
- `$browser->waitForInput(name, timeout?)` wait for input by name.
- `$browser->waitForLocation(url, timeout?)` wait for URL.
- `$browser->waitForEvent(type, target?, timeout?)` wait for DOM event.
- `$browser->waitForNotPresent(selector, options?)` wait for removal.
- `$browser->waitForText(text, timeout?, ignoreCase?)` wait for text.
- `$browser->waitUntilMissingText(text, timeout?, ignoreCase?)` wait for text to disappear.
- `$browser->waitForTextIn(selector, text, timeout?, ignoreCase?)` wait for text in selector.
- `$browser->waitUntilMissingTextIn(selector, text, timeout?, ignoreCase?)`.
- `$browser->_waitUntil(pageFunction, args?, message?, options?)` custom wait.
- `$browser->waitUntilAttribute(selector, attribute, value, message, options?)`.
- `$browser->waitUntilEnabled(selector, options?)`.
- `$browser->waitUntilDisabled(selector, options?)`.

## Finding elements

- `$browser->find(selector, options?)` waits for the first match; can throw on timeout or return null for a hidden-element wait.
- `$browser->findAll(selector, options?)` all matches.
- `$browser->_findOrFail(selector, options?)` all matches or throw.
- `$browser->_firstOrFail(selector, options?)` first match or throw.

## Assertions

- `$browser->assertTitle(title)`.
- `$browser->assertTitleContains(text)`.
- <SdkCall php="$browser-&gt;_assertHasCookie(name)" laravel="$browser-&gt;assertHasPlainCookie(name)" /> / <SdkCall php="$browser-&gt;_assertCookieMissing(name)" laravel="$browser-&gt;assertPlainCookieMissing(name)" /> / <SdkCall php="$browser-&gt;_assertCookieValue(name, value)" laravel="$browser-&gt;assertPlainCookieValue(name, value)" />.
- `$browser->assertSee(text, ignoreCase?)` / `$browser->assertDontSee(text, ignoreCase?)`.
- `$browser->assertSeeIn(selector, text, ignoreCase?)` / `$browser->assertDontSeeIn(selector, text, ignoreCase?)`.
- `$browser->assertSeeAnythingIn(selector)` / `$browser->assertSeeNothingIn(selector)`.
- `$browser->assertScript(expression, expected?)`.
- `$browser->assertSourceHas(code)` / `$browser->assertSourceMissing(code)`.
- `$browser->assertSeeLink(link, selector?, options?)` / `$browser->assertDontSeeLink(link, selector?, options?)`.
- `$browser->assertInputValue(field, value)` / `$browser->assertInputValueIsNot(field, value)`.
- `$browser->assertInputPresent(field, timeout?)` / `$browser->assertInputMissing(field, timeout?)`.
- `$browser->assertChecked(field, value?)` / `$browser->assertNotChecked(field, value?)` / `$browser->assertIndeterminate(field, value?)`.
- `$browser->assertRadioSelected(field, value)` / `$browser->assertRadioNotSelected(field, value?)`.
- `$browser->assertSelected(field, value)` / `$browser->assertNotSelected(field, value)`.
- `$browser->assertSelectHasOptions(field, values)` / `$browser->assertSelectMissingOptions(field, values)`.
- `$browser->assertSelectHasOption(field, value)` / `$browser->assertSelectMissingOption(field, value)`.
- `$browser->assertValue(selector, value)` / `$browser->assertValueIsNot(selector, value)`.
- `$browser->assertAttribute(selector, attribute, value)`.
- `$browser->assertAttributeMissing(selector, attribute)`.
- `$browser->assertAttributeContains(selector, attribute, value)`.
- `$browser->assertAttributeDoesntContain(selector, attribute, value)`.
- `$browser->assertAriaAttribute(selector, attribute, value)`.
- `$browser->assertDataAttribute(selector, attribute, value)`.
- `$browser->assertVisible(selector, options?)`.
- `$browser->assertMissing(selector, options?)`.
- `$browser->assertPresent(selector, options?)`.
- `$browser->assertNotPresent(selector, options?)`.
- `$browser->assertEnabled(field)` / `$browser->assertDisabled(field)`.
- `$browser->assertButtonEnabled(button)` / `$browser->assertButtonDisabled(button)`.
- `$browser->assertFocused(field)` / `$browser->assertNotFocused(field)`.
- `$browser->assertVue(key, value, componentSelector?)`.
- `$browser->assertVueIsNot(key, value, componentSelector?)`.
- `$browser->assertVueContains(key, value, componentSelector?)`.
- `$browser->assertVueDoesntContain(key, value, componentSelector?)` / `$browser->assertVueDoesNotContain(key, value, componentSelector?)`.
- `$browser->assertUrlIs(url, options?)`.
- `$browser->assertSchemeIs(scheme)` / `$browser->assertSchemeIsNot(scheme)`.
- `$browser->assertPathIs(path)` / `$browser->assertPathIsNot(path)`.
- `$browser->assertHostIs(host)` / `$browser->assertHostIsNot(host)`.
- `$browser->assertPortIs(port)` / `$browser->assertPortIsNot(port)`.
- `$browser->assertPathBeginsWith(path)` / `$browser->assertPathEndsWith(path)` / `$browser->assertPathContains(path)`.
- `$browser->assertQueryStringHas(name, value?)` / `$browser->assertQueryStringMissing(name)`.
- `$browser->assertFragmentIs(fragment)` / `$browser->assertFragmentIsNot(fragment)`.
- `$browser->assertFragmentBeginsWith(fragment)`.

## Dialogs

- `$browser->waitForDialog()`.
- `$browser->assertDialogOpened(message)`.
- `$browser->typeInDialog(value)`.
- `$browser->acceptDialog(value?)`.
- `$browser->dismissDialog()`.

## Client integration

<SdkContent sdk="laravel">

Laravel adds helpers such as `$browser->withinFrame($selector, $callback)` and named screenshots. See [Laravel integration](/guide/laravel) for framework behavior.

</SdkContent>

<SdkContent sdk="php">

This reference documents the standalone PHP remote Browser. Framework wrappers are documented separately under [Laravel integration](/guide/laravel).

</SdkContent>

## Resolver helpers

- `$browser->resolver(selector)` resolve a selector.
- `$browser->resolveForTyping(selector)`.
- `$browser->resolveForChecking(field, value?)`.
- `$browser->resolveForRadioSelection(field, value?)`.
- `$browser->resolveForSelection(field)`.
- `$browser->resolveSelectOptions(field)`.
- `$browser->resolveForField(field)`.
- `$browser->resolveForButtonPress(field)`.

## Misc

- `$browser->vueAttribute(componentSelector, key)` read Vue state.
- `$browser->inputValue(field)` get value for field.
- `$browser->isPage()` true if current site is a page.
