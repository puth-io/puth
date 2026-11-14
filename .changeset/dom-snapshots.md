---
'puth': minor
'@puth/gui': minor
'@puth/core': minor
---

Snapshots record the DOM of each page, and the GUI shows a step's Before and After rebuilt from it instead of the nearest frame: exact to the command, with the page's stylesheets, fonts and images served from the recording, without running scripts or loading anything from the network. Frames stay available through **Frame**. Set the context option `dom` to `false` to record frames only. Password and card number fields are masked.

The snapshot format is version 2. The GUI no longer opens snapshots saved by earlier versions.
