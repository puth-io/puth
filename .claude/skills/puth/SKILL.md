---
name: puth
description: Explore a web application in a real browser, check behavior, write PHP or Laravel browser tests, or find out why a browser test failed, using the puth MCP tools. Use for browser testing in this repository and when a Puth test fails.
---

# Browser testing with Puth

Start with `puth_status`. If no instance answers, run the command it reports. Do not start Puth another way.

## Explore or check something

1. `puth_session_create` with a `url`. Relative URLs use the application URL.
2. `puth_inspect` once to learn the page. Use `selector` to look at a part of it.
3. `puth_run` with all steps you can already name. Assertions retry and actions wait, so do not add waits or sleeps out of caution.
4. Read the `+` and `-` lines of the result. They say what changed, so inspect again only if you need more.
5. Close the session with `puth_session_close`.

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
            $browser->handoff('what this is for');

            // Assertions here run after the agent closed its session.
        });
    }
}
```

1. Run it in the background, it blocks until you release it.
2. Find it with `puth_contexts`, take it over with `puth_session_create` and `handoff=<id>`.
3. Use it like any session. Your requests run inside the test, so fakes and factories apply.
4. `puth_export` gives only the steps. Paste them in place of `handoff()`.
5. `puth_session_close` lets the test continue.

## Write a test

1. Do the workflow in a session, with assertions for what must be true. Actions passing proves nothing.
2. `puth_export` with `laravel` or `php`.
3. Resolve every `TODO`, then save the file with your normal tools.
4. Run it. The draft is unverified until the real suite passed it.

## Find out why a test failed

1. `puth_contexts` with `status=failed` or a `query`.
2. `puth_context` with its `id` shows the failed command, console errors and failed requests.
3. Use `view=commands`, `view=console` or `view=network` for more, and `frame=<command>` or `frame=-1` to see the page. Images cost far more than text.

For a downloaded snapshot, pass `file` instead of `id`.
