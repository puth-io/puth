# @puth/core

## 0.0.3

### Patch Changes

- 50a59a4: Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.

## 0.0.2

### Patch Changes

- de2f1f5: Deduplicate identical recorded response bodies in snapshots, resolve their references in the GUI, and add Laravel Dusk-compatible `assertCount` support.

## 0.0.1

### Patch Changes

- c26b29f: Publish the ESM core build required by puth at runtime.
