---
'puth': minor
'@puth/client': patch
'@puth/client-php': patch
'@puth/client-java': patch
---

Add `GET /health` and `GET /context/:id/snapshot`, and answer calls on unknown or destroyed contexts with a structured `ContextNotFound` error. Add `Browser.openPages()` and `Browser.onPage(index)`. The `track: ['network']` context option records network summaries without a debug server, and uncaught page errors are now recorded as console errors. Client request errors no longer go to stdout.
