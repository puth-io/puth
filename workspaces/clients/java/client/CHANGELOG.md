# @puth/client-java

## 0.2.0

### Minor Changes

- 7436000: - `evaluate()` calls the source of a function with its arguments, like Puppeteer: `evaluate('(a, b) => a + b', [1, 2])` returns `3`. Other sources stay expressions.
  - The new `pause(milliseconds)` waits on the server, so the portal keeps answering requests of the page meanwhile. In PHP it is `_pause()`; Laravel's `pause()`, and therefore `waitUsing()`, use it instead of `usleep()`.
  - A selector that starts with the resolver prefix is no longer prefixed again, so `text('body')` no longer looks for `body body`.
  - `clickAtXPath()` accepts parenthesised expressions such as `(//button)[last()]`.
  - Binary results such as screenshots are sent as `application/octet-stream`, so the PHP and Java clients save PNG bytes instead of `GenericObject(…)`, and the JS client returns a `Uint8Array` instead of failing to parse JSON.
- 5740f92: The client depends on Spring Boot 4.1 instead of 3.5, whose open source support ended, and on `spring-boot-starter-webmvc` instead of `spring-boot-starter-web`. Its JSON handling uses Jackson 2.21, which shares its annotations with Jackson 3 of Spring Boot 4. It no longer pins JUnit 5.10, so it runs with JUnit 6 of Spring Boot 4. Java 17 stays the minimum.

## 0.1.0

### Minor Changes

- 2ccebdf: Count the assertions that passed on the server, like the PHP client does for PHPUnit. `context.getAssertionCount()` returns the count, and `PuthPortalExtension` publishes it as the `puth.assertions` report entry of each test, since JUnit has no assertion count of its own.
- cf13b4d: Add `assertTextIs()`, which passes only when an element contains exactly the given text, ignoring surrounding and repeated whitespace. `assertSeeIn()` keeps checking that the text is contained.

### Patch Changes

- 82893ed: Report portal transport failures to the browser instead of leaving requests pending. Clients can answer with `error: {reason, message}`, which fails direct requests through CDP and returns a marked 502 for detours, while HTTP error responses stay ordinary responses. Requests no client answers now time out after `timeouts.portal` milliseconds (120000 by default), and detours deliver responses without a body such as 204 and 304.
- e0c9813: Add `GET /health` and `GET /context/:id/snapshot`, and answer calls on unknown or destroyed contexts with a structured `ContextNotFound` error. Add `Browser.openPages()` and `Browser.onPage(index)`. The `track: ['network']` context option records network summaries without a debug server, and uncaught page errors are now recorded as console errors. Client request errors no longer go to stdout.
- e6f04bb: Create contexts with a `create` factory in every client: `await Context.create('http://127.0.0.1:7345')` in TypeScript, `Context::create($url, $options)` in PHP and `Context.create(url, options)` in Java. The TypeScript factory now also takes the URL of a Puth instance instead of a `RemotePuthClient`, and the options are optional everywhere. The PHP and Java constructors keep working.
- e9aa8d8: Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.
- 29f5c40: Forward request bodies through `PuthPortalExtension`. Both `forMockMvc` and `forRandomPort` read the body from the field Puth sends, so form submissions and other requests with a body reach the application. `forMockMvc` also passes paths with query strings unchanged and serves the portal prefix itself as `/`. Tests are now grouped by their test class in the GUI instead of a JUnit-internal class name.
- a5ed1c5: Decode query parameters for `PuthPortalExtension.forMockMvc` like a servlet container does, so `+` in a query arrives as a space, as it does with `forRandomPort` and in production.

## 0.0.1

### Patch Changes

- 7eadda5: Add a Docker Compose development stack for Puth, the GUI, Laravel, and on-demand Java tests.
- cb0f7a6: Make browser interaction tests deterministic and align their expected behavior with the current API.
