# Laravel

The `puth/laravel` package integrates Puth with Laravel browser tests.

## Install

```sh
composer require --dev puth/laravel
php artisan puth:install
```

Configure the integration in `config/puth.php`. Start the [Puth server](./getting-started#start-the-server) separately and point the client to that instance.

## Configure the server and application URLs

Set `PUTH_INSTANCE_URL` in your test environment to the address the PHP test process uses to reach Puth:

```dotenv
PUTH_INSTANCE_URL=http://127.0.0.1:7345
APP_URL=http://127.0.0.1:8000
```

`APP_URL` is your application address, used for relative visits such as `$browser->visit('/login')`. With portal disabled, run your application server separately and make sure the browser on the Puth server can reach that address. When Puth runs in Docker, a host application's address will typically use `host.docker.internal` instead of `127.0.0.1`; see [Docker setup](./getting-started#docker).

## Run tests

Add your browser test directory to `phpunit.xml` so Laravel's normal test runner discovers it:

```xml
<testsuites>
    <!-- Keep your existing test suites here. -->
    <testsuite name="Browser">
        <directory>tests/Browser</directory>
    </testsuite>
</testsuites>
```

Run the tests with:

```sh
php artisan test
```

If you already have Dusk tests in `tests/Browser`, use a separate directory such as `tests/Puth` and register that directory instead. Both packages can coexist while you migrate. Puth tests use Laravel's test command.

## Write a browser test

Save a test such as `tests/Browser/ExampleBrowserTest.php`, extending the `Tests\PuthTestCase` created by `puth:install`:

```php
use Tests\PuthTestCase;
use Puth\Laravel\Browser;

class ExampleBrowserTest extends PuthTestCase
{
    public function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev');
            $browser->assertSee('Puth');
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

Options returned by `$this->getContextOptions()` can override these settings individually. See [portal and detours](./portal) for details.

## Moving from Dusk

You can keep Dusk and Puth installed while moving tests to a separate test directory. Follow [migrating from Dusk](./migration-from-dusk) for the server lifecycle, keyboard and dialog differences. The [Browser reference](/api/browser) distinguishes server method names from Laravel wrappers.
