---
title: What is Puth?
description: Browser testing with native clients, a realtime GUI and recorded test snapshots.
---

# What is Puth?

Puth is a browser testing framework built on Puppeteer. Write tests in your application's language, watch them run in a realtime GUI, and inspect recorded snapshots when something fails.

## How it works

Puth has two parts: a server that runs Chrome and provides the web GUI, and a client that sends browser commands from your tests. Run the server locally with npm or Docker, or on a machine your test runner can reach.

Your test uses a Browser object to visit pages, fill forms, click elements and check results. The [Laravel integration](./laravel) provides familiar Dusk-style methods and connects them to Laravel's test runner.

## See what your tests do

Open the server's GUI to follow browser activity and executed commands while tests run. When a test fails, a Puth snapshot lets you inspect the captured viewport, commands, console output and errors.

Save failed test snapshots as CI artifacts, then drag a `.puth` file into your local GUI to investigate the recorded run. See [CI/CD and snapshots](./ci-cd) for setup.

## Choose a client

Use the SDK selector to switch this documentation between Laravel and standalone PHP. The selected client changes examples, method signatures and lifecycle guidance. Other clients are in development.

<SdkContent sdk="laravel">

Puth's Laravel package provides Dusk-style browser methods and integrates with `php artisan test`. Follow [Laravel setup](./laravel), or see [migrating from Dusk](./migration-from-dusk) for existing tests.

</SdkContent>

<SdkContent sdk="php">

The standalone PHP client connects directly to the Puth server. You create and release contexts explicitly; Laravel configuration, encrypted-cookie helpers and automatic test artifacts do not apply. The client is still in development; see [Getting started](./getting-started#connect-a-client) for its current limitations.

</SdkContent>

Start with [Getting started](./getting-started) to run the server and connect your selected client.
