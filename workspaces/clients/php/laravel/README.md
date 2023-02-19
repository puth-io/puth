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