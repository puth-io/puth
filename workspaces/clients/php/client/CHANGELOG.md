# @puth/client-php

## 0.9.0

### Minor Changes

- cf13b4d: Add `assertTextIs()`, which passes only when an element contains exactly the given text, ignoring surrounding and repeated whitespace. `assertSeeIn()` keeps checking that the text is contained.
- e9aa8d8: Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.

### Patch Changes

- 82893ed: Report portal transport failures to the browser instead of leaving requests pending. Clients can answer with `error: {reason, message}`, which fails direct requests through CDP and returns a marked 502 for detours, while HTTP error responses stay ordinary responses. Requests no client answers now time out after `timeouts.portal` milliseconds (120000 by default), and detours deliver responses without a body such as 204 and 304.
- e0c9813: Add `GET /health` and `GET /context/:id/snapshot`, and answer calls on unknown or destroyed contexts with a structured `ContextNotFound` error. Add `Browser.openPages()` and `Browser.onPage(index)`. The `track: ['network']` context option records network summaries without a debug server, and uncaught page errors are now recorded as console errors. Client request errors no longer go to stdout.
- e6f04bb: Create contexts with a `create` factory in every client: `await Context.create('http://127.0.0.1:7345')` in TypeScript, `Context::create($url, $options)` in PHP and `Context.create(url, options)` in Java. The TypeScript factory now also takes the URL of a Puth instance instead of a `RemotePuthClient`, and the options are optional everywhere. The PHP and Java constructors keep working.
- 201e0a4: Fix `createBrowserShim()` outside of Laravel, which crashed on an uninitialized property, and count its assertions in PHPUnit.

## 0.8.2

### Patch Changes

- 8dd2876: Persist snapshots after failed tests when failure snapshot saving is enabled.
- 8dd2876: Add `assertCount` support.

## 0.8.1

### Patch Changes

- 153ebd4: fix(laravel): BinaryFileResponse content handling

## 0.8.0

### Minor Changes

- 2821c7d: release autogen RemoteObjects

## 0.7.2

### Patch Changes

- 64cc867: support phpunit v11

## 0.7.1

### Patch Changes

- 9aff21a: test new ci/cd

## 0.7.0

### Minor Changes

- edf9740: test new ci/cd

## puth/laravel, until 2026-11-10

The Laravel integration was released as `puth/laravel` (`@puth/client-laravel`) until it moved into `puth/php`.

### 0.11.0

#### Minor Changes

- e9aa8d8: Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.

#### Patch Changes

- Updated dependencies [82893ed]
- Updated dependencies [cf13b4d]
- Updated dependencies [e0c9813]
- Updated dependencies [e6f04bb]
- Updated dependencies [e9aa8d8]
- Updated dependencies [201e0a4]
  - @puth/client-php@0.9.0

### 0.10.3

#### Patch Changes

- 8dd2876: Persist snapshots after failed tests when failure snapshot saving is enabled.
- Updated dependencies [8dd2876]
- Updated dependencies [8dd2876]
  - @puth/client-php@0.8.2

### 0.10.2

#### Patch Changes

- bf7884d: Restore Laravel Dusk's `script()` browser method as a deprecated alias for `evaluate()`.

### 0.10.1

#### Patch Changes

- 153ebd4: fix(laravel): BinaryFileResponse content handling
- Updated dependencies [153ebd4]
  - @puth/client-php@0.8.1

### 0.10.0

#### Minor Changes

- 4bd0efc: Add a `PuthEnablePortal` test trait for opting into portal and detour request handling.

#### Patch Changes

- 7eadda5: Add a Docker Compose development stack for Puth, the GUI, Laravel, and on-demand Java tests.
- 23a5aee: Fix browser event waits so listeners remain active until their event is observed.
- 6f02f05: Keep browser authentication assertions within the browser session.
- 9a24b5c: Give the local file-upload test fixture the field name used by Laravel's attachment resolver.
- ef32905: Set a loopback remote address for portal requests so Laravel's trusted-proxy check does not receive a null IP address.
- 3998e65: Use deterministic local previews when testing file uploads.
- 0fd0cca: Verify that portal-backed browser authentication updates the test application's session.

### 0.9.1

#### Patch Changes

- Updated dependencies [2821c7d]
  - @puth/client-php@0.8.0

### 0.9.0

#### Minor Changes

- 1a08f69: change dependencies to not be restricted from newer package versions

### 0.8.0

#### Minor Changes

- fde46d4: updated browser namespace

### 0.7.1

#### Patch Changes

- 9aff21a: test new ci/cd
- Updated dependencies [9aff21a]
  - @puth/client-php@0.7.1

### 0.7.0

#### Minor Changes

- edf9740: test new ci/cd

#### Patch Changes

- Updated dependencies [edf9740]
  - @puth/client-php@0.7.0
