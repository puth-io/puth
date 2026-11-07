---
'puth': patch
---

Stop reporting calls as successful when their page closes, and fail them with a `PageClosed` error instead. Browser asserts and waits now retry for their timeout when a navigation replaces the page under them, where they previously passed or failed by accident. Actions are not repeated.
