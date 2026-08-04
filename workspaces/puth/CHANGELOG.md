# puth

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
