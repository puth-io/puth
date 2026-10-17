# Laravel

The `puth/laravel` package integrates Puth with Laravel browser tests.

## Install

```sh
composer require --dev puth/laravel
php artisan puth:install
```

Configure the integration in `config/puth.php`. Start the [Puth server](./getting-started#start-the-server) separately and point the client to that instance.

## Run tests

Add your browser test directory to `phpunit.xml` so Laravel's normal test runner discovers it:

```xml
<testsuite name="Browser">
    <directory>tests/Browser</directory>
</testsuite>
```

Run the tests with:

```sh
php artisan test
```

If you already have Dusk tests in `tests/Browser`, use a separate directory such as `tests/Puth` and register that directory instead. Both packages can coexist while you migrate. Puth tests use Laravel's test command.

## Write a browser test

```php
use Tests\PuthTestCase;
use Puth\Laravel\Browser;

class ExampleBrowserTest extends PuthTestCase
{
    public function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev')
                ->assertSee('Puth');
        });
    }
}
```

The [Laravel Dusk documentation](https://laravel.com/docs/dusk) covers the familiar browser basics, element interactions, assertions, pages and components. Check the differences below when adapting existing tests.

## Portal

Portal lets application requests run through the test process, including the authenticated user set by `$this->actingAs()`.

Portal and detour handling are disabled by default in Laravel tests. Enable both with the `PuthEnablePortal` trait:

```php
use Puth\Laravel\PuthEnablePortal;
use Tests\PuthTestCase;

class ExampleBrowserTest extends PuthTestCase
{
    use PuthEnablePortal;
}
```

Options returned by `getContextOptions()` can override these settings individually. See [portal and detours](./portal) for details.

## Moving from Dusk

Puth provides a Dusk replacement, with some differences:

- Start the Puth server separately; the integration does not launch the browser process.
- `keys()` uses the [Puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput).
- Replace `typeInDialog(selector, value)` with `acceptDialog(value)`.
- Replace `$this->driver->executeScript()` with `$this->evaluate()`.
- Console logs and some assertion error messages have different formats.
- `moveMouse($xOffset, $yOffset)` is unsupported.
