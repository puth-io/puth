# @puth/core

## 0.1.0

### Minor Changes

- 9dcb07c: The DOM recording includes iframes, also of other sites and nested in each other, and the GUI shows them in place. Typed values in frames of another origin than a page above them are masked, like payment fields.
- 48a972b: The DOM recording includes open shadow roots, also nested and attached later, the stylesheets that documents and shadow roots adopt, and which dialogs are modal and which popovers are open. The GUI rebuilds web components with their styles and shows dialogs and popovers in the top layer.
- 720449a: Snapshots record the DOM of each page, and the GUI shows a step's Before and After rebuilt from it instead of the nearest frame: exact to the command, with the page's stylesheets, fonts and images served from the recording, without running scripts or loading anything from the network. Frames stay available through **Frame**. Set the context option `dom` to `false` to record frames only. Password and card number fields are masked.
  
  The snapshot format is version 2. The GUI no longer opens snapshots saved by earlier versions.
- 262cb0d: Actions record the element they act on and, for mouse actions, where they press. The GUI marks both in the recorded DOM of a step, Before and After, also inside frames. `clickAtPoint` counts as an action now, so it never runs twice. Toggles next to the page URL hide these marks and darken the preview.

## 0.0.3

### Patch Changes

- 50a59a4: Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.

## 0.0.2

### Patch Changes

- de2f1f5: Deduplicate identical recorded response bodies in snapshots, resolve their references in the GUI, and add Laravel Dusk-compatible `assertCount` support.

## 0.0.1

### Patch Changes

- c26b29f: Publish the ESM core build required by puth at runtime.
