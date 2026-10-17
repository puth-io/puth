---
title: Laravel test artifacts
description: Automatic screenshots, console logs and failed test snapshots.
sdk: laravel
---

# Laravel test artifacts

The Laravel integration collects debugging output around `$this->browse()` callbacks and the test lifecycle. This automation is provided by the Laravel test case, not by every Puth client.

## Screenshots and logs

When a browse callback fails, the integration saves a failure screenshot under `tests/Browser/screenshots` and page source under `tests/Browser/source`. It also saves browser console logs under `tests/Browser/console`.

Failure screenshots capture the full page by default. To capture only the viewport:

```php
$browser->fitOnFailure = false;
```

To save a named screenshot yourself:

```php
$browser->screenshot('checkout', ['fullPage' => true]);
```

This writes `tests/Browser/screenshots/checkout.png` on the machine running the PHP test process.

## Failed test snapshots in CI

Run your tests with `CI=true`:

```sh
CI=true php artisan test
```

The Laravel test case enables saving snapshots for failed tests when `CI` is `true` or `1`. Collect the snapshot directory from the Puth server, which may be on a different machine from the PHP test runner.

See [CI/CD and snapshots](./ci-cd) for paths, artifact collection and replay instructions.
