---
'puth': minor
'@puth/gui': minor
'@puth/core': minor
---

Actions record the element they act on and, for mouse actions, where they press. The GUI marks both in the recorded DOM of a step, Before and After, also inside frames. `clickAtPoint` counts as an action now, so it never runs twice.
