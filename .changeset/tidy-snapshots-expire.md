---
'puth': minor
---

Clean up the default snapshot directory after saving, keeping at most 200 snapshots, 1 GiB and 14 days. Configure this with `snapshotRetention`, or set it to `false`. Custom locations are not touched. Servers in debug mode now only save snapshots of failed tests on their own.
