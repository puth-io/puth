---
title: Dialogs and prompts
description: Handling alerts, confirms, and prompts.
sdks: [java, js]
---

# Dialogs and prompts

These helpers handle native JavaScript `window.alert()`, `window.confirm()` and `window.prompt()` dialogs. For a modal rendered inside your page, use normal element selectors and clicks instead.

## Basics

- `$browser->waitForDialog()` waits for any dialog to open.
- `$browser->assertDialogOpened(message)` asserts the dialog message.
- `$browser->acceptDialog(value?)` accepts a dialog (and fills a prompt).
- `$browser->dismissDialog()` dismisses a dialog.

```php
$browser->click('#delete');
$browser->assertDialogOpened('Are you sure?');
$browser->acceptDialog();
```
```java
browser.click("#delete");
browser.assertDialogOpened("Are you sure?");
browser.acceptDialog();
```
```ts
await browser.click('#delete');
await browser.assertDialogOpened('Are you sure?');
await browser.acceptDialog();
```

## Prompt input

The current Browser API supports two ways to supply prompt text:

- `$browser->typeInDialog(value)` queues input until accept.
- `$browser->acceptDialog(value)` accepts and supplies the input in one step.

```php
$browser->click('#rename');
$browser->acceptDialog('New name');
```
```java
browser.click("#rename");
browser.acceptDialog("New name");
```
```ts
await browser.click('#rename');
await browser.acceptDialog('New name');
```

`$browser->typeInDialog()` queues text; it does not close the prompt. Call `$browser->acceptDialog()` to submit that text, or `$browser->dismissDialog()` to cancel. The cached text is cleared after either action.

## Cancel a dialog

```php
$browser->click('#delete');
$browser->assertDialogOpened('Are you sure?');
$browser->dismissDialog();
```
```java
browser.click("#delete");
browser.assertDialogOpened("Are you sure?");
browser.dismissDialog();
```
```ts
await browser.click('#delete');
await browser.assertDialogOpened('Are you sure?');
await browser.dismissDialog();
```

Accept or dismiss every dialog your test opens so it can continue interacting with the page.
