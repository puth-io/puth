---
title: Context
description: Context lifecycle and server helpers.
sdks: [java, js]
---

# Context

The Context object manages the browser session lifecycle and server-side helpers.

<SdkContent sdk="laravel">

In Laravel tests, access it as `$this->context`.

</SdkContent>

<SdkContent sdk="php">

In standalone PHP, create it with `\Puth\Context::create($serverUrl, $options)`.

</SdkContent>

<SdkContent sdk="java">

Create it with `Context.create(serverUrl, options)`. With the [Spring Boot integration](/guide/spring-boot), the extension creates it for each test.

</SdkContent>

<SdkContent sdk="js">

Create it with `await Context.create(serverUrl, options)`.

</SdkContent>

## Browser lifecycle

- `$context->createBrowserShim(options?, shimOptions?)` creates a Browser shim around a page in a new browser context. The first argument configures browser creation; the second configures shim options such as timeouts.
- `$context->destroy(options?)` tear down the context (supports delayed destroy).

## Test status

- `$context->testFailed()` mark the test as failed.
- `$context->testSuccess()` mark the test as success.
- `$context->testSucceeded()` alias for success.

## Snapshots

- `$context->getSnapshotsByType(type)` return snapshots for a given type.

## Temporary files

- `$context->saveTemporaryFile(name, content)` uploads **base64-encoded** content to a temporary file on the server and returns its path. The file is removed during context cleanup.

## Portal settings

The `portal` and `detour` options are set when the context is created and cannot be changed afterwards. See [portal and detours](/guide/portal) for the options and each client's defaults.
