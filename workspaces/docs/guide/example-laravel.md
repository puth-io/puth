---
title: Laravel example
description: Capture a failure, explore with an agent and author a test.
---

# Laravel example

This walks through failure capture, MCP exploration, test authoring and CI artifacts using this repository's Laravel test application. It only needs Docker with Compose.

```sh
docker compose up --build --wait puth laravel
```

Puth's GUI is now at `http://localhost:7345`, and the application is at `http://laravel:8080` from the browser's point of view.

## Capture a failure

Add a failing test to `workspaces/clients/php/workspaces/laravel/tests/Browser/ExampleFailureTest.php`:

```php
<?php

namespace Tests\Browser;

use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class ExampleFailureTest extends PuthTestCase
{
    protected bool $saveSnapshotOnFailure = true;

    function test_title()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/')->assertTitle('Not the title');
        });
    }
}
```

Run it:

```sh
docker compose run --rm --no-deps laravel-test php artisan test --without-tty --cache-directory=/tmp/phpunit-cache --filter=ExampleFailureTest
```

The test fails, and the Puth server writes a snapshot to `workspaces/puth/storage/snapshots`. Open the GUI and drop the `.puth` file into the window to step through the commands, frames, console output and the error. Delete the test afterwards.

## Read the failure as an agent

Build the MCP server with `npm run build` and [connect your client](./mcp#setup). The agent can read the failed test directly from the instance:

```json
{ "tool": "puth_contexts", "arguments": { "status": "failed" } }
{ "tool": "puth_context", "arguments": { "id": "3f2a91bc" } }
```

## Explore with an agent

```json
{ "tool": "puth_status" }
{ "tool": "puth_session_create", "arguments": { "name": "Testbed loads", "url": "/" } }
{ "tool": "puth_inspect", "arguments": { "sessionId": "1a2b3c4d" } }
{ "tool": "puth_run", "arguments": { "sessionId": "1a2b3c4d", "steps": [{ "op": "title", "text": "laravel puth testbed" }] } }
```

The agent runs next to your tests in its own context, so it can explore while a suite is running.

## Author a test

Export what the session did:

```json
{ "tool": "puth_export", "arguments": { "sessionId": "1a2b3c4d", "format": "laravel", "name": "Testbed loads" } }
```

The result is an unverified draft. Resolve its `TODO`s, then save it as `tests/Browser/TestbedLoadsTest.php` and run it. Only this run verifies the draft:

```sh
docker compose run --rm --no-deps laravel-test php artisan test --without-tty --cache-directory=/tmp/phpunit-cache --filter=TestbedLoadsTest
```

`./docker/dev/test-mcp-drafts.sh` does all of this automatically for a longer workflow, and also checks that a wrong assertion fails.

## Work behind a login

Write a test that logs in and [hands over](./mcp#taking-over-a-test), run it in the background, and take it over. `./docker/dev/test-mcp-handoff.sh` shows this with `Mail::fake()`: the agent visits a page that sends a mail, and the test sees that mail afterwards.

## Collect artifacts in CI

Snapshots are written by the Puth server, so upload its directory even when tests fail:

```yaml
- name: Upload Puth snapshots
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: puth-snapshots
    path: workspaces/puth/storage/snapshots
```

Download the artifact and drop the file into a local GUI to [inspect the failure](./ci-cd#inspect-a-failure-locally).
