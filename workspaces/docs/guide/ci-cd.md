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
$context = new \Puth\Context('http://127.0.0.1:7345', ['snapshot' => true]);
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

If you install Puth with npm, cache the browser download directory between jobs. Puth checks `~/.cache/puth` and `.cache/puppeteer` relative to the server's working directory.

## Preserve failed test snapshots

Snapshot files are written by the **Puth server**, so collect artifacts from the machine or container running it. The default location is `storage/snapshots` relative to the server’s working directory. In the Puth Docker image this is `/puth/storage/snapshots`. The [Compose example](./getting-started#docker-compose) mounts that directory to `./puth/snapshots` on the host.

Configure your CI provider to upload the snapshot directory even when the test step fails. If you override the snapshot location, collect that directory instead.

## Inspect a failure locally

1. Download the `.puth` snapshot artifact from your CI run.
2. Start a local Puth server and open its GUI at `http://localhost:7345`.
3. Drag and drop the snapshot file into the GUI.
4. Step through the recorded commands and inspect the viewport, console output and errors.

Snapshots let you inspect the captured test run without having to reproduce the failure first.
