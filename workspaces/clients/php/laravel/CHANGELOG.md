# @puth/client-laravel

## 0.10.2

### Patch Changes

- bf7884d: Restore Laravel Dusk's `script()` browser method as a deprecated alias for `evaluate()`.

## 0.10.1

### Patch Changes

- 153ebd4: fix(laravel): BinaryFileResponse content handling
- Updated dependencies [153ebd4]
  - @puth/client-php@0.8.1

## 0.10.0

### Minor Changes

- 4bd0efc: Add a `PuthEnablePortal` test trait for opting into portal and detour request handling.

### Patch Changes

- 7eadda5: Add a Docker Compose development stack for Puth, the GUI, Laravel, and on-demand Java tests.
- 23a5aee: Fix browser event waits so listeners remain active until their event is observed.
- 6f02f05: Keep browser authentication assertions within the browser session.
- 9a24b5c: Give the local file-upload test fixture the field name used by Laravel's attachment resolver.
- ef32905: Set a loopback remote address for portal requests so Laravel's trusted-proxy check does not receive a null IP address.
- 3998e65: Use deterministic local previews when testing file uploads.
- 0fd0cca: Verify that portal-backed browser authentication updates the test application's session.

## 0.9.1

### Patch Changes

- Updated dependencies [2821c7d]
  - @puth/client-php@0.8.0

## 0.9.0

### Minor Changes

- 1a08f69: change dependencies to not be restricted from newer package versions

## 0.8.0

### Minor Changes

- fde46d4: updated browser namespace

## 0.7.1

### Patch Changes

- 9aff21a: test new ci/cd
- Updated dependencies [9aff21a]
  - @puth/client-php@0.7.1

## 0.7.0

### Minor Changes

- edf9740: test new ci/cd

### Patch Changes

- Updated dependencies [edf9740]
  - @puth/client-php@0.7.0
