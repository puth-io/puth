---
'puth': minor
'@puth/client': patch
'@puth/client-php': minor
'@puth/client-java': patch
'@puth/client-laravel': minor
---

Add `Context.handoff()` and `$browser->handoff()` in Laravel. A test can set up what it needs, then hand its browser to another client while it keeps answering portal requests, and continues once the browser is released. `GET /contexts` lists what an instance knows about, and `GET /context/:id/snapshot` now also serves finished contexts. Failed requests record why they failed.
