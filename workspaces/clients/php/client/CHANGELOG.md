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
