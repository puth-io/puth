---
'@puth/client-java': minor
---

Count the assertions that passed on the server, like the PHP client does for PHPUnit. `context.getAssertionCount()` returns the count, and `PuthPortalExtension` publishes it as the `puth.assertions` report entry of each test, since JUnit has no assertion count of its own.
