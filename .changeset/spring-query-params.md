---
'@puth/client-java': patch
---

Decode query parameters for `PuthPortalExtension.forMockMvc` like a servlet container does, so `+` in a query arrives as a space, as it does with `forRandomPort` and in production.
