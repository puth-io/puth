# CI/CD and snapshots

Run Puth alongside your application and test runner in CI. Docker or Podman includes the compatible Chrome version, which avoids downloading a browser on every run. See [getting started](./getting-started#start-the-server) for server installation options.

## Run the tests

Start the Puth server, configure its URL in your application's `config/puth.php`, and run your Laravel tests with `CI=true`:

```sh
CI=true php artisan test
```

The Laravel integration enables saving snapshots for failed tests when `CI` is `true` or `1`. Register your browser test directory in `phpunit.xml` as described in the [Laravel guide](./laravel#run-tests).

If you install Puth with npm, cache the browser download directory between jobs. Puth checks `~/.cache/puth` and `.cache/puppeteer` relative to the server's working directory.

## Preserve failed test snapshots

Snapshot files are written by the **Puth server**, so collect artifacts from the machine or container running it. The default location in the current server is `storage/snapshots` relative to its working directory. Container images may configure their own working directory; mount the corresponding directory to persist those files after the container exits.

Configure your CI provider to upload the snapshot directory even when the test step fails. If you override the snapshot location, collect that directory instead.

## Inspect a failure locally

1. Download the `.puth` snapshot artifact from your CI run.
2. Start a local Puth server and open its GUI at `http://localhost:7345`.
3. Drag and drop the snapshot file into the GUI.
4. Step through the recorded commands and inspect the viewport, console output and errors.

Snapshots let you inspect the captured test run without having to reproduce the failure first.
