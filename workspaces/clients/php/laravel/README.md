## Puth integration for Laravel

### Installation

```bash
composer require --dev puth/laravel
```

### Configuration

You can find the configuration for this package in `config/puth.php` after publishing it.

```bash
php artisan vendor:publish --provider=Puth\\Laravel\\PuthServiceProvider
```

### Example Browser Test

```php
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;

class ExampleBrowserTest extends PuthDuskTestCase
{
    function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://puth.dev')
                ->assertSee('Puth');
        });
    }
}
```

## Transition from Dusk

The `puth/laravel` package provides an almost complete replacement for Dusk. There are only 4 methods that are not
supported and never will be due to the limitations of the underlying library `puppeteer`.

Another difference is that `puth/laravel` does not start the browser process. For that you need to run `puth` (e.g. in
Docker) and point the client to the instance of `puth`. `puth/laravel` once contained code to start the `puth` process
but I don't think enough people would use this feature so I removed it.

### Changed methods

- `$browser->keys()`: The keys method doesn't use the php-webdriver keymap. **Instead** the
  [puppeteer keymap](https://pptr.dev/api/puppeteer.keyinput) is used and it is **case sensitive**!

### Unsupported methods

- `$browser->maximize()`: Puppeteer has no way of controlling the actual browser window
- `$browser->move($x = 100, $y = 100)`: Puppeteer has no way of controlling the actual browser window
- `$browser->typeInDialog(selector, value)`: Please use the accept method which now takes a value `$browser->acceptDialog(value)`
- `$browser->moveMouse($xOffset, $yOffset)`: Puppeteer doesn't have an actual mouse therefore you can't move it by an offset. We could track the mouse x and y location but then we need to update it on $page->click, $element->click, ...
- `$browser->ensurejQueryIsAvailable()`: Puppeteer doesn't come with jquery because its not needed

### Implementation needed

- `$browser->storeConsoleLog('filename')`: There is no exact equivalent for console logs but we can provide better ones
- `$browser->waitForEvent`:
- `$browser->withinFrame`:
