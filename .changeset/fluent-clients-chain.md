---
'@puth/client': minor
---

Chain Browser calls under one `await`, like `await browser.visit(url).type('email', 'ada@example.com').assertSee('Welcome')`. The calls run in order and stop at the first failure, and a call that returns a value ends the chain. `Context.create()` chains too, so `await Context.create(url).createBrowserShim()` returns a Browser.
