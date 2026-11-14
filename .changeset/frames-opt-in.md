---
'puth': minor
'@puth/gui': minor
'@puth/client': minor
'@puth/client-php': minor
'@puth/client-java': minor
'@puth/mcp': patch
---

Recorded frames are off by default, since the GUI shows the recorded DOM. Turn them on with the context option `frames`, with `Context.enableFrames()` and `disableFrames()` while a test runs, or in Laravel with the `PuthEnableFrames` trait. MCP sessions keep recording them, and `puth_context` takes the last address from the recorded navigations. Frames are stored as Chrome sends them and the GUI crops them to the viewport, so Puth no longer depends on `sharp`.
