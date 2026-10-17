---
title: Migrating from Dusk
description: Key differences when moving from Laravel Dusk.
---

# Migrating from Dusk

Puth mirrors most of the Dusk Browser API, but a few behaviors differ.

## Server lifecycle

- Dusk starts ChromeDriver for you. Puth does not.
- Run the Puth server separately and configure your client to connect.

## Unsupported

- `$browser->moveMouse(xOffset, yOffset)` is not supported.
- Several window and cookie helpers do not work on iframes.

## API differences

- <SdkCall php="$browser-&gt;_keys()" laravel="$browser-&gt;keys()" /> uses Puppeteer key names and braced special-key sequences such as `{Backspace}`. See [keyboard input](./interacting-with-elements#typing-and-values).
- Use `$browser->acceptDialog(value)` to supply prompt text while accepting the dialog. The current API also exposes `$browser->typeInDialog(value)`, which queues text until acceptance.
- Replace WebDriver `$driver->executeScript()` calls with `$browser->evaluate()`; see [evaluating JavaScript](./browser-basics#evaluate-javascript).
- Some assertion error messages are phrased differently.
- Console output format is different from Dusk.

Register your Puth test directory in `phpunit.xml` and run `php artisan test`. Existing Dusk tests can stay in a separate directory while you migrate. See [Laravel setup](./laravel) and [waiting and sync](./waiting-and-sync) for configuration.

## Application requests

Portal and detours are disabled by default in Laravel tests. If your tests need application requests to run through the test process, enable portal explicitly as described in [portal and detours](./portal).
