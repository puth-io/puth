---
'puth': patch
'@puth/client-php': patch
'@puth/client-java': patch
---

Report portal transport failures to the browser instead of leaving requests pending. Clients can answer with `error: {reason, message}`, which fails direct requests through CDP and returns a marked 502 for detours, while HTTP error responses stay ordinary responses. Requests no client answers now time out after `timeouts.portal` milliseconds (120000 by default), and detours deliver responses without a body such as 204 and 304.
