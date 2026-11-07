---
'@puth/client-php': patch
---

Fix `createBrowserShim()` outside of Laravel, which crashed on an uninitialized property, and count its assertions in PHPUnit.
