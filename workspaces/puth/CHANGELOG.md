# puth

## 0.9.0

### Minor Changes

- 4b0739a: Limit recordings with configurable budgets, by default 256 MiB per context and 1 GiB per instance, set through the `recording` option. A context that reaches a budget stops recording and shows one warning while its browser keeps working, and finished recordings are evicted before active ones are truncated. `GET /diagnostics` reports recording sizes, truncation status, active contexts and pooled browsers.

  Pages can no longer cause unhandled rejections on the server by logging objects that can't be encoded, such as circular ones.

- cf13b4d: Add `assertTextIs()`, which passes only when an element contains exactly the given text, ignoring surrounding and repeated whitespace. `assertSeeIn()` keeps checking that the text is contained.
- e0c9813: Add `GET /health` and `GET /context/:id/snapshot`, and answer calls on unknown or destroyed contexts with a structured `ContextNotFound` error. Add `Browser.openPages()` and `Browser.onPage(index)`. The `track: ['network']` context option records network summaries without a debug server, and uncaught page errors are now recorded as console errors. Client request errors no longer go to stdout.
- c103158: Make browser calls flake resistant. Assertions retry until they pass or time out, and safe reads retry when the page changes under them. Actions wait until their element can be acted on: visible, enabled, attached, not readonly, not moving and not covered. Calls pause while the page transitions to the next document, up to `timeouts.pageLoad` milliseconds (30000 by default). After an action, the next call that does not retry on its own waits `timeouts.actionSettle` milliseconds (20 by default, 0 turns it off) in case a navigation is about to start. An action that reached the page now succeeds even if the page closes because of it. Pass `force: true` to `click` to skip the checks.
- e9aa8d8: Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.
- 382ee95: Clean up the default snapshot directory after saving, keeping at most 200 snapshots, 1 GiB and 14 days. Configure this with `snapshotRetention`, or set it to `false`. Custom locations are not touched. Servers in debug mode now only save snapshots of failed tests on their own.
- aac19a4: Watch agents in the GUI. The new Agents view lists sessions of the MCP server, live ones first, and tests an agent took over. Steps are grouped by tool call, drafts appear next to the steps they were made of, and what the server does for itself, such as reading the page outline, is left out. Follow keeps the newest step selected. Puth records `handoff` packets when a test waits for, is claimed by and gets back its browser, and contexts accept `annotate()` marks, which the MCP server sends.

  Steps are numbered, colored by what they do (open a page, act, check or read), and split by dividers into the pages they ran on. Puth records a `navigation` packet when the main frame navigates, also within the document, and when `setContent` sets a page, with its title. Each step is one line, and its full arguments, a console message or a request show up when the mouse rests on it. Durations only show where they matter. Console output and requests sit collapsed between the steps they followed, and failed requests appear in the failure summary and a Network tab.

### Patch Changes

- 5c4fecd: Report the result of a test after releasing its handoff, list test classes in `puth_contexts`, show one command with its full arguments in `puth_context`, and summarize failures in the order they happened. Commands that test runners make around a test are left out unless `all` is set.
- 82893ed: Report portal transport failures to the browser instead of leaving requests pending. Clients can answer with `error: {reason, message}`, which fails direct requests through CDP and returns a marked 502 for detours, while HTTP error responses stay ordinary responses. Requests no client answers now time out after `timeouts.portal` milliseconds (120000 by default), and detours deliver responses without a body such as 204 and 304.
- 50a59a4: Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.
- 623da01: Keep contexts isolated when another context closes, settle pending calls when a page, context or browser disappears, and release browser pool references, user data directories and temporary files after failures. Repeated context destruction is now safe.
- fbbc6c8: Stop recording screencast frames and final screenshots for contexts created with `snapshot: false`. Console messages are still captured, because clients read them.
- 13b118d: Stop reporting calls as successful when their page closes, and fail them with a `PageClosed` error instead. Browser asserts and waits now retry for their timeout when a navigation replaces the page under them, where they previously passed or failed by accident. Actions are not repeated.
- Updated dependencies [50a59a4]
- Updated dependencies [cf13b4d]
- Updated dependencies [8903ec4]
- Updated dependencies [aac19a4]
- Updated dependencies [33dc85c]
- Updated dependencies [e0c9813]
- Updated dependencies [e6f04bb]
- Updated dependencies [0759ec8]
- Updated dependencies [e9aa8d8]
- Updated dependencies [1fc99c3]
- Updated dependencies [aac19a4]
  - @puth/core@0.0.3
  - @puth/gui@0.2.0
  - @puth/client@0.1.0

## 0.8.5

### Patch Changes

- e30d9eb: Give portal detours distinct browser cache identities per context, original URL, and portal path, while retaining stable URLs for repeated requests.
- cad1f02: Preserve base64 response bodies until portal fulfillment so detoured requests return the original bytes without double decoding.
- b47444a: Honor typing delays in mixed text and special-key sequences, and replace removed Puppeteer timeout calls when releasing keys and selecting all.

## 0.8.4

### Patch Changes

- c9ce01c: Build the GUI without requiring Core's generated runtime entry point during publishing, and release Puth so its Docker image includes the GUI update.
- Updated dependencies [c9ce01c]
  - @puth/gui@0.1.4

## 0.8.3

### Patch Changes

- de2f1f5: Deduplicate identical recorded response bodies in snapshots, resolve their references in the GUI, and add Laravel Dusk-compatible `assertCount` support.
- 1e10c04: Return `unknown error` for calls that reject without an error value.
- Updated dependencies [de2f1f5]
  - @puth/core@0.0.2
  - @puth/gui@0.1.3

## 0.8.2

### Patch Changes

- 7eadda5: Add a Docker Compose development stack for Puth, the GUI, Laravel, and on-demand Java tests.
- af2c35a: Release call stacks, CDP sessions, listeners, dialogs, and portal state when pages close.
- ef32905: Add per-context controls for portal request handling and detours.
- 23a5aee: Fix browser event waits so listeners remain active until their event is observed.
- ef32905: Fix browser interaction state leaks and honour timeouts consistently for event waits and element assertions.
- b97ad4f: Fix the `--disable-cors` option so Docker's default configuration permits GUI WebSocket connections. Log CORS allowlisted origins on startup when CORS is enabled. Fix portal and JavaScript client URL construction so HTTP URLs retain their protocol separator. Make `clickLink` select links by visible text.
- ef32905: Keep text waits polling while a navigation temporarily replaces the document.
- f05ebd2: Continue portal response queues when Chrome cancels an intercepted request before its response arrives.
- a745c61: Fail paused browser requests cleanly when asynchronous portal interception fails.
- 86bdfca: Preserve dialog responses when a browser call is interrupted by portal request handling.
- 049245a: Preserve UTF-8 and omitted POST data when forwarding portal requests without detours.
- a92b484: Keep portal and detour controls as context creation options instead of runtime APIs.
- a72fdbd: Store iframe browser call stacks under their parent page consistently.
- 8ad8d25: Reject portal responses that do not match the active intercepted request.
- Updated dependencies [e87f57e]
- Updated dependencies [b97ad4f]
  - @puth/client@0.0.2

## 0.8.1

### Patch Changes

- c26b29f: Publish the ESM core build required by puth at runtime.
- Updated dependencies [c26b29f]
- Updated dependencies [c26b29f]
  - @puth/core@0.0.1
  - @puth/client@0.0.1

## 0.8.0

### Minor Changes

- 8917b3c: release autogen

## 0.7.2

### Patch Changes

- 2bfd053: bump @puth/gui to v0.1.2

## 0.7.1

### Patch Changes

- eebe942: fixed puth inside docker image not binding to any interface

## 0.7.0

### Minor Changes

- eac694f: update dependencies, small bug fixes

### Patch Changes

- Updated dependencies [eac694f]
  - @puth/gui@0.1.1

## 0.6.11

### Patch Changes

- 385f5bf: move image repo

## 0.6.10

### Patch Changes

- ce0f194: test new ci/cd

## 0.6.9

### Patch Changes

- 2d52e28: test new ci/cd

## 0.6.8

### Patch Changes

- edf9740: test new ci/cd

## 0.6.7

### Patch Changes

- bf15d88: added @puth/client

## 0.6.6

### Patch Changes

- Updated dependencies [d4f0513]
  - @puth/gui@0.1.0
