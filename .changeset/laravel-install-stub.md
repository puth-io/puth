---
'@puth/client-php': patch
---

`php artisan puth:install` now writes a `tests/PuthTestCase.php` that works on Laravel 12 and 13. It used the `CreatesApplication` trait, which new applications no longer have, on every version but 11.
