---
'puth': minor
---

Limit recordings with configurable budgets, by default 256 MiB per context and 1 GiB per instance, set through the `recording` option. A context that reaches a budget stops recording and shows one warning while its browser keeps working, and finished recordings are evicted before active ones are truncated. `GET /diagnostics` reports recording sizes, truncation status, active contexts and pooled browsers.

Pages can no longer cause unhandled rejections on the server by logging objects that can't be encoded, such as circular ones.
