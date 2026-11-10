---
'puth': minor
---

The call after an action no longer waits 20ms. It makes one round trip to the page instead, which receives a navigation that the action requested, such as a submitted form, and costs well under a millisecond. A navigation that starts later, from a timer or after a request, needs a wait or an assertion before the next action. `timeouts.actionSettle` now defaults to `0` and still adds a fixed delay when set.
