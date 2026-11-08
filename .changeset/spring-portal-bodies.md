---
'@puth/client-java': patch
---

Forward request bodies through `PuthPortalExtension`. Both `forMockMvc` and `forRandomPort` read the body from the field Puth sends, so form submissions and other requests with a body reach the application. `forMockMvc` also passes paths with query strings unchanged and serves the portal prefix itself as `/`. Tests are now grouped by their test class in the GUI instead of a JUnit-internal class name.
