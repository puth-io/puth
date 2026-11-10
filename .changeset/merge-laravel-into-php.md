---
'@puth/client-php': minor
---

The Laravel integration moved from `puth/laravel` into `puth/php`, so there is one PHP package with one version. This release is 0.12.0, above the last versions of both packages. Replace `puth/laravel` with `puth/php` in `composer.json`; class names such as `Puth\Laravel\Browser` stay the same and Laravel still discovers the service provider. Plain PHP projects install no Laravel packages, and Laravel versions below 12 are declared as a conflict.
