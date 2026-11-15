# @puth/core

## 0.1.0

### Minor Changes

- 9dcb07c: The DOM recording includes iframes, also of other sites and nested in each other, and the GUI shows them in place. Typed values in frames of another origin than a page above them are masked, like payment fields.
- 720449a: Snapshots record the DOM of each page, and the GUI shows a step's Before and After rebuilt from it instead of the nearest frame: exact to the command, with the page's stylesheets, fonts and images served from the recording, without running scripts or loading anything from the network. Frames stay available through **Frame**. Set the context option `dom` to `false` to record frames only. Password and card number fields are masked.
  
  The snapshot format is version 2. The GUI no longer opens snapshots saved by earlier versions.

## 0.0.3

### Patch Changes

- 50a59a4: Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.

## 0.0.2

### Patch Changes

- de2f1f5: Deduplicate identical recorded response bodies in snapshots, resolve their references in the GUI, and add Laravel Dusk-compatible `assertCount` support.

## 0.0.1

### Patch Changes

- c26b29f: Publish the ESM core build required by puth at runtime.
