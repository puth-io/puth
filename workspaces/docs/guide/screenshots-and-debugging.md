---
title: Screenshots and debugging
description: Save screenshots and inspect recorded test failures.
---

# Screenshots and debugging

Use a screenshot to capture a single view of the page. Use a Puth snapshot when you need the recorded commands, console output and errors as well.

## Save a screenshot

<SdkContent sdk="laravel">

Use Laravel's named screenshot wrapper:

```php
$browser->screenshot('checkout', ['fullPage' => true]);
```

This writes `tests/Browser/screenshots/checkout.png` on the PHP test runner. For automatic failure screenshots and console logs, see [Laravel test artifacts](./laravel-debugging).

</SdkContent>

<SdkContent sdk="php">

Use the low-level PHP screenshot call and save its response stream:

```php
$image = $browser->_screenshot(['fullPage' => true]);
file_put_contents('checkout.png', (string) $image);
```

The standalone client does not assign a filename or save screenshots automatically.

</SdkContent>

`fullPage` captures the whole scrollable page; omit it to capture the viewport. Screenshots are not supported on iframe-scoped browsers. `$browser->fitContent()` changes the viewport to fit the document, which can also change a responsive layout.

## Replay a captured test

Open the local GUI at `http://localhost:7345` and drop a `.puth` file into it to inspect the captured run. Step through commands and compare the viewport with the console output and errors.

See [CI/CD and snapshots](./ci-cd) to save failed test snapshots and collect them as artifacts. In the examples above, screenshot files are saved by the PHP test process; `.puth` snapshots are saved by the Puth server, which may run on a different machine.
