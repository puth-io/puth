---
"puth": patch
"@puth/client": patch
---

Fix the `--disable-cors` option so Docker's default configuration permits GUI WebSocket connections. Log CORS allowlisted origins on startup when CORS is enabled. Fix portal and JavaScript client URL construction so HTTP URLs retain their protocol separator. Make `clickLink` select links by visible text.
