# Is the 20ms wait after actions needed?

Find out whether `timeouts.actionSettle` protects against anything real, and
remove it or replace it with something that does not cost time on every action.

## Today

After an action, the next call that does not retry on its own waits until 20ms
have passed since the action returned (`Context.applyCall` →
`PageStability.settled`). The reason given: a navigation can start shortly after
the action returned, like a submitted form, and the next call would otherwise
run against the old document.

- Assertions, waits and reads skip the wait, because they retry.
- Calls on objects without a page skip it.
- So it hits action after action: `type`, `type`, `click` pays twice.

History:

| Commit | Change |
| --- | --- |
| before `c103158` | No wait. This is the "was not a problem before" state. |
| `c103158` feat(puth): make browser calls flake resistant | Introduced a 50ms wait for every call after an action. |
| `7afe9aa` perf(puth): shorten the wait after actions | 20ms, skipped for retrying calls, configurable, `0` turns it off. |

`c103158` also added what makes the wait questionable: calls pause while the
main frame loads, actions wait for an actionable target, and reads and
assertions retry. Before it, a late navigation showed up as a stale element or
destroyed execution context, and tests worked around it. No test in the
repository demonstrates a failure that only the wait prevents: the three tests
in `flake-resistance.test.ts` only check that the wait happens, is skipped, or
is off.

## Questions

1. Which sequence fails with `actionSettle: 0`? The candidate is action →
   action across a navigation: `click('Submit')` followed by `type(...)` into a
   field that exists on both the old and the new page.
2. How late does `Page.frameRequestedNavigation` or `Page.frameStartedLoading`
   arrive after the action's CDP response, for a form submit, a link click, and
   `location.href = ...` inside a click handler and inside a `setTimeout(0)`?
3. What does the wait cost on a real suite?

## Work

- [ ] Write tests against the fixtures for the sequences in question 1, each
  run with `actionSettle: 0`, repeated often enough to trust (at least 200
  runs, also under CPU load). These tests stay, whatever the outcome.
- [ ] Log the delay from question 2 in a scratch script and note the
  distribution here.
- [ ] Run the PHP, Laravel and Java suites five times each with the default set
  to `0`, and compare failures and duration with the current default.

Then pick one:

- **No failure reproduces.** Set the default to `0`. Keep the option for one
  release, mark it deprecated, and remove the wait code afterwards.
- **Failures reproduce, and the navigation is always announced within one
  round trip.** Replace the timer with a flush: after an action, wait for one
  CDP round trip on the page session before the next non-retrying call, so
  events that were already emitted are processed. This costs well under a
  millisecond locally and does not depend on machine speed.
- **Failures reproduce and no bound exists** (navigation from a timer or after
  a request). Then 20ms does not fix it either. Set the default to `0` and
  document that such an action needs a following wait or assertion, which is
  what Cypress and Playwright require too.

Keeping a fixed 20ms is the outcome to avoid: it is either unnecessary or not
enough.

## Also update

`AGENTS.md` (Browser call behavior), `workspaces/docs/guide/waiting-and-sync.md`,
`dev/specs/reliability-and-mcp.md`, the three tests named above, and a Changeset
for `puth`.

## Acceptance

- The new tests pass reliably with the chosen behavior.
- The measurements and the decision are recorded in this file.
- A chain of 20 actions on an idle page takes no longer than it does with
  `actionSettle: 0` today.
