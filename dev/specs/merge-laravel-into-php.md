# Merge `puth/laravel` into `puth/php`

Ship the Laravel integration inside `puth/php`, so there is one PHP package, one
version and one release job.

## Today

| | `puth/php` | `puth/laravel` |
| --- | --- | --- |
| Directory | `workspaces/clients/php/client` | `workspaces/clients/php/laravel` |
| Namespace | `Puth\` → `src` | `Puth\Laravel\` → `src/` |
| npm name for Changesets | `@puth/client-php` 0.9.0 | `@puth/client-laravel` 0.11.0 |
| Requires | `guzzlehttp/guzzle`, `phpunit/phpunit` | `illuminate/{console,log,support}`, `phpunit/phpunit`, `puth/php: *` |
| Split repository | `puth-io/php` | `puth-io/laravel` |
| Extras | generated `RemoteObjects` | service provider, `config/puth.php`, `stubs/`, `misc/jquery.js` |

`puth/laravel` uses six classes of `puth/php` (`Context`, `RemoteObject`,
`Traits\PuthAssertions`, `Traits\PuthTestCaseTrait`, `Utils\BackTrace`,
`Utils\MimeType`). Nothing in `puth/php` refers to `Puth\Laravel`.

A Laravel release needs two tags, `bin/make-laravel-release.js` to pin
`puth/php` and drop the path repository, and two split jobs in `tag.yml`.

## Target

- One package, `puth/php`, in `workspaces/clients/php/client`.
- Laravel classes keep their names. `Puth\Laravel\Browser` moves to
  `src/Laravel/Browser.php`, which the existing `Puth\` → `src` mapping already
  resolves, so no test of a user changes its imports.
- Plain PHP projects install no Laravel packages. `illuminate/*` is not in
  `require`.
- Laravel still discovers `Puth\Laravel\PuthServiceProvider` through
  `extra.laravel.providers`.

## Decisions to confirm

1. **Version of the merged package.** Recommended: `0.12.0`, above both current
   versions, so the final `puth/laravel` can require `puth/php: ^0.12`.
2. **What happens to `puth/laravel` on Packagist.** Recommended: one last
   release that contains only a `composer.json` requiring `puth/php` and a
   README, then mark it abandoned with `puth/php` as replacement and archive
   `puth-io/laravel`. Existing projects keep working after `composer update`
   and see the notice. `replace` in `puth/php` alone is not enough, because
   Composer does not find a package by a name it only replaces.
3. **Laravel version floor.** `composer.json` says `illuminate/*: >=9.0`, CI
   tests Laravel 12 and 13. Recommended: declare what CI tests, as a `conflict`
   for older `illuminate/support`, since `require` is not available.

## Work

### Package

- [ ] Move `laravel/src/**` to `client/src/Laravel/**` with `git mv`, also
  `config/`, `stubs/` and `misc/`. Fix the `__DIR__` paths in
  `PuthServiceProvider` (config), `Console/InstallCommand` (stubs) and
  `Browser` (jQuery), which are one level deeper afterwards.
- [ ] `client/composer.json`: add `extra.laravel.providers`, `ext-json`,
  `suggest` and `conflict` for `illuminate/*`, and `require-dev` for what the
  Laravel classes need under static analysis. Drop the alias
  `"Browser": "Browser\\Browser"`, which points to no class.
- [ ] `Utils/BackTrace.php` filters frames by the paths `puth/php/src` and
  `puth/workspaces/clients/php/client/src`. Check that Laravel frames are still
  treated as before, now that they live under the same path.
- [ ] Merge `laravel/README.md`, `TODO.md` and `CHANGELOG.md` into the client
  package. Keep the Laravel changelog as a dated section, do not rewrite it.
- [ ] Delete `workspaces/clients/php/laravel`, and its entry in the root
  `package.json` workspaces.

### Test application

- [ ] `workspaces/clients/php/workspaces/laravel/composer.json`: require
  `puth/php` through the path repository instead of `puth/laravel`.
- [ ] `phpunit.xml`: one coverage directory, `./vendor/puth/php/src`.
- [ ] `.run/puth_laravel.run.xml`, `.run/puth_php.run.xml`.

### Release

- [ ] Delete `release-client-laravel` and the `@puth/client-laravel@*` trigger
  from `tag.yml`, the `laravel` remote from `bin/php-split.sh`, the second
  split from `sync-master.yml`, and `bin/make-laravel-release.js`.
- [ ] Add a Changeset for `@puth/client-php` with the version from decision 1.
- [ ] After the release, publish the final `puth/laravel` by hand in
  `puth-io/laravel` (decision 2).

### References

- [ ] Docs: `guide/laravel.md`, `guide/getting-started.md`,
  `guide/client-support.md` and the install command of the `laravel` entry in
  `.vitepress/lib/sdk.ts` say `composer require --dev puth/php`. The SDK
  selector keeps `laravel` and `php` as separate flavors.
- [ ] Add a short upgrade note: replace `puth/laravel` with `puth/php` in
  `composer.json`, nothing else changes.
- [ ] `test.yml` comment on `dev-master as 13.99.0`, `dev/act/ref-tag.json`,
  `AGENTS.md` and `dev/TESTING.md` where they name the package.

Unchanged: `bin/codegen-clients.js` (output path and `NAME_TRANSLATION.php.laravel`),
the `php` and `laravel` targets of `puth_export`, `compose.yml` service names.

## Acceptance

- The `php` suite passes with no `illuminate/*` package installed.
- The `laravel` suite passes for the whole CI matrix, with package discovery
  finding the provider and `php artisan puth:install` writing its stubs.
- A project that only swaps `puth/laravel` for `puth/php` in `composer.json`
  runs its tests unchanged.
- `git grep -E 'puth/laravel|client-laravel'` only finds changelogs and the
  upgrade note.
