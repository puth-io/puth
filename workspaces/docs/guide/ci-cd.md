---
sdks: [java, js]
---

# CI/CD and snapshots

Run Puth alongside your application and test runner in CI. Docker or Podman includes the compatible Chrome version, which avoids downloading a browser on every run. See [getting started](./getting-started#start-the-server) for server installation options.

## Run the tests

Start the Puth server and your application, then run your project's test command. Saving a `.puth` snapshot requires a context with snapshot recording enabled.

<SdkContent sdk="laravel">

The Laravel test case enables snapshot recording and can save failures automatically. See [Laravel test artifacts](./laravel-debugging#failed-test-snapshots-in-ci) for `CI=true` configuration.

</SdkContent>

<SdkContent sdk="php">

Enable snapshot recording when creating the context. Your test runner must report failures and request a saved snapshot before cleanup:

```php
$context = \Puth\Context::create('http://127.0.0.1:7345', ['snapshot' => true]);
$cleanup = ['immediately' => true];
try {
    $browser = $context->createBrowserShim();
    $browser->visit('https://playground.puth.dev');
    if (!str_contains($browser->text('body'), 'Puth')) {
        throw new \RuntimeException('Expected Puth on the page.');
    }
} catch (\Throwable $error) {
    $context->testFailed();
    $cleanup['save'] = ['to' => 'file'];
    throw $error;
} finally {
    $context->destroy($cleanup);
}
```

Unlike the Laravel test case, the standalone PHP client does not interpret the `CI` variable to save failures automatically.

</SdkContent>

<SdkContent sdk="java">

Enable snapshot recording when creating the context. Report a failure and request a saved snapshot before cleanup:

```java
Context context = Context.create("http://127.0.0.1:7345", Map.of("snapshot", true));
Map<String, Object> cleanup = new HashMap<>(Map.of("immediately", true));
try {
    Browser browser = context.createBrowserShim();
    browser.visit("https://playground.puth.dev")
        .assertSee("Puth");
} catch (Throwable error) {
    context.testFailed();
    cleanup.put("save", Map.of("to", "file"));
    throw error;
} finally {
    context.destroy(cleanup);
}
```

The client does not interpret the `CI` variable to save failures automatically. In a JUnit suite, a [`TestWatcher`](https://junit.org/junit5/docs/current/api/org.junit.jupiter.api/org/junit/jupiter/api/extension/TestWatcher.html) extension can do this for every test.

</SdkContent>

<SdkContent sdk="js">

Enable snapshot recording when creating the context. Report a failure and request a saved snapshot before cleanup:

```ts
const context = await Context.create('http://127.0.0.1:7345', { snapshot: true });
const cleanup: Record<string, unknown> = { immediately: true };
try {
    const browser = await context.createBrowserShim();
    await browser.visit('https://playground.puth.dev');
    await browser.assertSee('Puth');
} catch (error) {
    await context.testFailed();
    cleanup.save = { to: 'file' };
    throw error;
} finally {
    await context.destroy(cleanup);
}
```

The client does not interpret the `CI` variable to save failures automatically.

</SdkContent>

If you install Puth with npm, cache the browser download directory between jobs. Puth checks `~/.cache/puth` and `.cache/puppeteer` relative to the server's working directory.

## Preserve failed test snapshots

Snapshot files are written by the **Puth server**, so collect artifacts from the machine or container running it. The default location is `storage/snapshots` relative to the server’s working directory. In the Puth Docker image this is `/puth/storage/snapshots`. The [Compose example](./getting-started#docker-compose) mounts that directory to `./puth/snapshots` on the host.

Configure your CI provider to upload the snapshot directory even when the test step fails. If you override the snapshot location, collect that directory instead.

## Keep the snapshot directory small

After saving a snapshot, Puth removes the oldest ones from the default directory once it holds more than 200 snapshots or 1 GiB, or for snapshots older than 14 days. The newest snapshot always stays, and other files and custom locations are not touched. Change the limits in `puth.config.json`, or set `snapshotRetention` to `false` to keep everything:

```json
{
  "snapshotRetention": { "maxFiles": 50, "maxBytes": 268435456, "maxAgeDays": 7 }
}
```

A server in debug mode also saves failed tests on its own, but not passing ones.

## Inspect a failure locally

1. Download the `.puth` snapshot artifact from your CI run.
2. Start a local Puth server and open its GUI at `http://localhost:7345`.
3. Drag and drop the snapshot file into the GUI.
4. Step through the recorded commands and inspect the viewport, console output and errors.

Snapshots let you inspect the captured test run without having to reproduce the failure first.
