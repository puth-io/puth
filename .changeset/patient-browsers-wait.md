---
'puth': minor
---

Make browser calls flake resistant. Assertions retry until they pass or time out, and safe reads retry when the page changes under them. Actions wait until their element can be acted on: visible, enabled, attached, not readonly, not moving and not covered. Calls pause while the page transitions to the next document, up to `timeouts.pageLoad` milliseconds (30000 by default). An action that reached the page now succeeds even if the page closes because of it. Pass `force: true` to `click` to skip the checks.
