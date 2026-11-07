---
'@puth/core': patch
'@puth/gui': patch
'puth': patch
---

Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.
