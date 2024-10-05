## Puth integration for Laravel

### Installation

```bash
composer require --dev puth/laravel:1.0.0-alpha.0
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
use Puth\Laravel\Browser\Browser;

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

### Changes

- `$browser->keys()`: This method now uses the [puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput) (instead of the php-webdriver keymap) is used (when using modifier keys you can only type/press american keyboard layout keys)
- `$browser->typeInDialog(selector, value)`: Use the accept method instead which takes a value `$browser->acceptDialog(value)`
- console logs are different from Dusk console logs. They now contain more information but the underlying json structure changed.

### Unsupported

- `$browser->moveMouse($xOffset, $yOffset)`: Puppeteer only simulates a mouse but doesn't expose the internal tracking state so we can't move the mouse by an offset
