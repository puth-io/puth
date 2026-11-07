---
name: puth
description: Explore a web application in a real browser, check behavior, write PHP or Laravel browser tests, or find out why a browser test failed, using the puth MCP tools. Use for browser testing in this repository and when a Puth test fails.
---

# Browser testing with Puth

Start with `puth_status`. If no instance answers, run the command it reports. Do not start Puth another way.

## Explore or check something

1. `puth_session_create` with a `url`. Relative URLs use the application URL.
2. `puth_inspect` once to learn the page. Use `selector` for a part of it, and `find` to search it.
3. `puth_run` with all steps you can already name. Assertions retry and actions wait, so do not add waits or sleeps out of caution.
4. Read the `+` and `-` lines of the result. They say what changed, including text in quotes, so inspect again only if you need more.
5. Close the session with `puth_session_close`, also when something failed. Open sessions keep a browser running for 30 minutes.

`+` lines for text say where it is, like `+ "Saved" in #status`, which is what a `seeIn` or `textIs` assertion needs. `seeIn` passes when the element contains the text, `textIs` only when that is all of its text.

Prefer `press` and `clickLink` with visible text while exploring, and selectors that do not start with `~` in tests. A `~` selector depends on the position in the page.

## Use an application behind a login or with test data

Portal requests are answered by the process of the test, so write a test that prepares everything and hands over:

```php
class AgentSessionTest extends PuthTestCase
{
    use PuthEnablePortal;

    function test_agent_session()
    {
        Mail::fake();
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')->loginAs($user);

            // Asserting the result keeps PHPUnit from marking the test as risky.
            Assert::assertSame('released', $browser->handoff('what this is for'));
        });

        // Checks here run after the agent closed its session, like Mail::assertSentCount(1).
    }
}
```

1. Run it in the background, for example with `&`. It blocks until you release it.
2. Find it with `puth_contexts`, take it over with `puth_session_create` and `handoff=<id>`. The session is already logged in.
3. Use it like any session. Your requests run inside the test, so fakes and factories apply.
4. `puth_export` gives only the steps. Paste them in place of `handoff()`.
5. `puth_session_close` lets the test continue, and reports its result if it finishes within a few seconds.

What happened in the application, like sent mail, is not visible in the browser. Check it in the test after `handoff()` returned.

## Write a test

1. Do the workflow in a session, with assertions for what must be true. Actions passing proves nothing.
2. `puth_export` with `laravel` or `php`.
3. Resolve every `TODO`, then save the file with your normal tools.
4. Run it. The draft is unverified until the real suite passed it.

## Find out why a test failed

1. `puth_contexts` with `status=failed` or a `query`, which also matches the test class.
2. `puth_context` with its `id` shows what went wrong in the order it happened: an error before a failed command is usually its cause.
3. Use `view=commands` (`all=true` adds what the test runner did around the test), `view=console` or `view=network` for more, `command=<number>` for one command with its full arguments, and `frame=<command>` or `frame=-1` to see the page. Images cost far more than text.

For a downloaded snapshot, pass `file` instead of `id`.
