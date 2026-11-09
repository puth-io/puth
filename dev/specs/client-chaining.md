# Chaining in client libraries

Browser calls that return the Browser (`this` or another generated class in the
codegen metadata) should chain in every client, so a test reads the same in each
language:

```
visit(url) → type('email', …) → press('Log in') → assertSee('Welcome')
```

Every client follows the same rules:

1. Calls run in order, each after the previous one reached the server and returned.
2. The chain stops at the first failure and reports that failure. Later calls are
   not sent.
3. A call that returns a value (`title()`, `evaluate()`, `text()`) ends the chain
   and yields that value.
4. Chaining is optional. Calling each method on its own, and waiting for it,
   keeps working.

Synchronous clients (PHP, Java) chain by returning the object. Asynchronous
clients chain over their future type:

| Language | Style | Implementation |
| --- | --- | --- |
| PHP, Java | `$browser->visit($url)->assertSee('Welcome');` | The method blocks and returns the object. |
| TypeScript (implemented) | `await browser.visit(url).assertSee('Welcome');` | Generated methods return `Chain<T>`: a `Promise<T>` whose property access queues the next call on the resolved value (`RemoteObject.ts`). Value-returning methods return a plain `Promise`. |
| C# | `await browser.Visit(url).AssertSee("Welcome");` | Methods return `Task<Browser>`. Generate extension methods on `Task<Browser>` that await the task and call the method, so the chain compiles to sequential awaits. A `ValueTask` or custom awaitable works the same way. |
| Rust | `browser.visit(url).assert_see("Welcome").await?;` | Methods take `&Browser` and return a `Chain` builder that records the calls and implements `IntoFuture`. Awaiting runs the calls in order and returns `Result<T, puth::Error>`. Value methods on the builder change its output type, like `.title().await? -> String`. Use `type_()` or `r#type()` for the reserved word. |
| Go | `err := browser.Visit(url).AssertSee("Welcome").Err()` | Go has no futures. Calls block, and on failure the Browser value records the first error and turns later calls into no-ops. `Err()` returns it. Value methods return `(value, error)` and end the chain. Pass a `context.Context` per call or once with `browser.WithContext(ctx)`. |

The await sits at the start of the chain in TypeScript and C#, and at the end in
Rust, as each language's syntax requires. The method names and their order stay
the same, so examples can be translated line by line.

When adding a generator under `bin/codegen`, derive chainability from the return
type (`this` or a generated class) the same way `isChainable()` in
`bin/codegen/typescript.js` does.
