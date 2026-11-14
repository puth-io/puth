---
title: Screenshots and debugging
description: Save screenshots and inspect recorded test failures.
sdks: [java, js]
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

<SdkContent sdk="java">

`browser.screenshot()` returns the image as a stream. Save it yourself:

```java
try (InputStream image = (InputStream) browser.screenshot(Map.of("fullPage", true))) {
    Files.copy(image, Path.of("checkout.png"));
}
```

The client does not assign a filename or save screenshots automatically.

</SdkContent>

<SdkContent sdk="js">

`browser.screenshot()` returns the image as bytes. Save it yourself:

```ts
import { writeFile } from 'node:fs/promises';

await writeFile('checkout.png', await browser.screenshot({ fullPage: true }));
```

The client does not assign a filename or save screenshots automatically.

</SdkContent>

`fullPage` captures the whole scrollable page; omit it to capture the viewport. Screenshots are not supported on iframe-scoped browsers. `$browser->fitContent()` changes the viewport to fit the document, which can also change a responsive layout.

## Replay a captured test

Open the local GUI at `http://localhost:7345` and drop a `.puth` file into it to inspect the captured run. Step through commands and compare the viewport with the console output and errors.

![A snapshot of a failed test opened in the GUI, with the failing step selected](/assets/image/puth-replay.png)

Imported snapshots are listed under **Local snapshots** in the side rail, apart from the tests of a connected instance. The GUI needs no connection to open them.

### The recorded DOM

With snapshots enabled, Puth records the DOM of each page: a full copy when a document loads, then the changes, sent by the page at the start of every command. Selecting a step shows its page rebuilt from that recording, **Before** as it was when the step started and **After** as it was when the next step on the same page started. Unlike a screenshot this is exact, because it does not depend on when the browser painted.

The rebuilt page runs no scripts and loads nothing from the network: stylesheets, fonts and images are served from the recording, also when the application is gone, so an imported snapshot looks the same on any machine. Values in password fields and card number fields (`autocomplete="cc-…"`) are masked before they leave the page.

Some content is not part of the recording and shows up empty or unstyled: `<canvas>` drawings, video frames, the contents of iframes and shadow roots, and stylesheets that scripts construct (`adoptedStyleSheets`). Media queries follow the browser the GUI runs in. Record frames for such pages.

### Recorded frames

Frames are the pictures Chrome paints. They are off by default; turn them on with the context option `frames`, or for a part of a test with `enableFrames()` and `disableFrames()`. A step then offers **Frame** next to **DOM**. In Laravel tests, use the [`PuthEnableFrames` trait](./laravel#recorded-frames).

```ts
const context = await Context.create('http://127.0.0.1:7345', { snapshot: true, frames: true });
await context.disableFrames();
```

Set `dom` to `false` to record no DOM.

See [CI/CD and snapshots](./ci-cd) to save failed test snapshots and collect them as artifacts. In the examples above, screenshot files are saved by the test process; `.puth` snapshots are saved by the Puth server, which may run on a different machine.
