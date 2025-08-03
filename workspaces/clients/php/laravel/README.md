## Puth integration for Laravel

### Installation

```bash
composer require --dev puth/laravel
```

After installing the Puth package, run the `puth:install` Artisan command.

```bash
php artisan puth:install
```

### Configuration

You can find the configuration file for this package in `config/puth.php`.

### Example Browser Test

```php
use Tests\PuthTestCase;
use Puth\Laravel\Browser;

class ExampleBrowserTest extends PuthTestCase
{
    function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev')
                ->assertSee('Puth');
        });
    }
}
```

## Transition from Dusk

The `puth/laravel` package provides a full replacement for Dusk.

Another difference is that `puth/laravel` does not start the browser process. For that you need to run `puth` (e.g. in
Docker) and point the client to the `puth` instance. `puth/laravel` once contained code to launch the `puth` process
but I don't think enough people would use this feature so I removed it.

Some exception messages changed, mostly the ones thrown by assert functions, e.g. instead of `Element [body #not-existing-element] not found` you will see `Waited 200ms for selector [body body #not-existing-element]` when calling `$browser->assertVisible('body #not-existing-element')`.

### Portal

- Portal routes all requests through the testcase process, therefore every browser request that goes to the application will act on the currently authenticated user. E.g. if you call $this->actingAs(), your browser requests will also be authenticated as that user. 

### Changes

- `$browser->keys()`: This method now uses the [puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput) (instead of the php-webdriver keymap) is used (when using modifier keys you can only type/press american keyboard layout keys)
- `$browser->typeInDialog(selector, value)`: Use the accept method instead which takes a value `$browser->acceptDialog(value)`
- console logs are different from Dusk console logs. They now contain more information but the underlying json structure changed.

- `$this->driver->executeScript()` becomes `$this->evaluate()`

### Unsupported

- `$browser->moveMouse($xOffset, $yOffset)`: Puppeteer only simulates a mouse but doesn't expose the internal tracking state so we can't move the mouse by an offset
