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

The `puth/laravel` package provides a full* replacement for Dusk.
* Four methods are not supported and never will be due to the limitations of the underlying library `puppeteer`.

Another difference is that `puth/laravel` does not start the browser process. For that you need to run `puth` (e.g. in
Docker) and point the client to the `puth` instance. `puth/laravel` once contained code to launch the `puth` process
but I don't think enough people would use this feature so I removed it.

Iframes (in the `withinFrame()` method) are only partially supported at the moment.

Console logs are different then the dusk console logs. They contain more information but the underlying json structure changed.

### Changed methods

- `$browser->keys()`: This method no longer uses the php-webdriver keymap. **Instead** the
  [puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput) is used and it is **case sensitive**!
- `$browser->typeInDialog(selector, value)`: Please use the accept method which now takes a value `$browser->acceptDialog(value)`

### Unsupported methods

- `$browser->maximize()`: Puppeteer has no way of controlling the actual browser window
- `$browser->move($x = 100, $y = 100)`: Puppeteer has no way of controlling the actual browser window
- `$browser->moveMouse($xOffset, $yOffset)`: Puppeteer doesn't have an actual mouse therefore can't move it by an offset. We could track the mouse x and y location but then we need to update it on $page->click, $element->click, ...
- `$browser->ensurejQueryIsAvailable()`: Puppeteer doesn't come with jquery because it's not needed
