---
title: Context
description: Context lifecycle and server helpers.
---

# Context

The Context object manages the browser session lifecycle and server-side helpers. Calls use the PHP Context object. In Laravel tests, access it as `$this->context`; in standalone PHP, create it with `new \Puth\Context($serverUrl, $options)`.

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

- `$context->enablePortal()` / `$context->disablePortal()` change request interception.
- `$context->enableDetour()` / `$context->disableDetour()` change the fallback for unreadable request bodies.

See [portal and detours](/guide/portal) for context options and Laravel defaults.
