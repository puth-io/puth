---
'puth': minor
'@puth/client': minor
'@puth/client-java': minor
'@puth/client-php': minor
---

- `evaluate()` calls the source of a function with its arguments, like Puppeteer: `evaluate('(a, b) => a + b', [1, 2])` returns `3`. Other sources stay expressions.
- The new `pause(milliseconds)` waits on the server, so the portal keeps answering requests of the page meanwhile. In PHP it is `_pause()`; Laravel's `pause()`, and therefore `waitUsing()`, use it instead of `usleep()`.
- A selector that starts with the resolver prefix is no longer prefixed again, so `text('body')` no longer looks for `body body`.
- `clickAtXPath()` accepts parenthesised expressions such as `(//button)[last()]`.
- Binary results such as screenshots are sent as `application/octet-stream`, so the PHP and Java clients save PNG bytes instead of `GenericObject(…)`, and the JS client returns a `Uint8Array` instead of failing to parse JSON.
