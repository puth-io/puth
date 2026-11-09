# @puth/client

## 0.1.0

### Minor Changes

- cf13b4d: Add `assertTextIs()`, which passes only when an element contains exactly the given text, ignoring surrounding and repeated whitespace. `assertSeeIn()` keeps checking that the text is contained.
- 8903ec4: Chain Browser calls under one `await`, like `await browser.visit(url).type('email', 'ada@example.com').assertSee('Welcome')`. The calls run in order and stop at the first failure, and a call that returns a value ends the chain. `Context.create()` chains too, so `await Context.create(url).createBrowserShim()` returns a Browser.
- 1fc99c3: Add generated, typed `Context` and `Browser` classes, like the PHP and Java clients have. Use `Context.create(client, options)` to get started. The existing dynamic API keeps working.

### Patch Changes

- 33dc85c: Reject calls whose expectation failed with an `ExpectationFailedError`. Failed Browser assertions used to look like successful calls.
- e0c9813: Add `GET /health` and `GET /context/:id/snapshot`, and answer calls on unknown or destroyed contexts with a structured `ContextNotFound` error. Add `Browser.openPages()` and `Browser.onPage(index)`. The `track: ['network']` context option records network summaries without a debug server, and uncaught page errors are now recorded as console errors. Client request errors no longer go to stdout.
- e6f04bb: Create contexts with a `create` factory in every client: `await Context.create('http://127.0.0.1:7345')` in TypeScript, `Context::create($url, $options)` in PHP and `Context.create(url, options)` in Java. The TypeScript factory now also takes the URL of a Puth instance instead of a `RemotePuthClient`, and the options are optional everywhere. The PHP and Java constructors keep working.
- e9aa8d8: Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.

## 0.0.2

### Patch Changes

- e87f57e: Add an awaitable remote property deletion helper and make remote property mutations deterministic.
- b97ad4f: Fix the `--disable-cors` option so Docker's default configuration permits GUI WebSocket connections. Log CORS allowlisted origins on startup when CORS is enabled. Fix portal and JavaScript client URL construction so HTTP URLs retain their protocol separator. Make `clickLink` select links by visible text.

## 0.0.1

### Patch Changes

- c26b29f: Publish the current client build for runtime compatibility.
