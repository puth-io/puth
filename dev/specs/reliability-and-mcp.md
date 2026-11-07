# Puth reliability and agent workflows

Status: implemented. Unchecked items are planned work, not completed capabilities.

## Goals and delivery order

Make Puth dependable for development and CI, then expose the same testing
environment to Claude Code, Codex and other MCP clients for validation and test
authoring.

- [x] Deliver the reliability foundation: local fixtures, context isolation,
  portal failures, snapshot replay coverage, and recording limits.
- [x] Deliver an MCP server for browser exploration, validation, and PHP/Laravel
  test authoring.
- [x] Configure the project MCP connection to use the Puth instance used by its
  development tests, and document the complete workflow.

MCP v1 helps agents inspect applications and produce test code. Agents write
source files and execute repository tests using their existing editor and
terminal tools.

## Milestone 1: reliability foundation

### Deterministic browser fixtures

- [x] Serve playground scenarios locally through Compose for Node, PHP, and Java
  suites.
- [x] Replace public-site dependencies with fixture URLs supplied through test
  configuration.
- [x] Provide two local origins for navigation, cookies, redirects, and
  cross-origin scenarios.
- [x] Use the same fixtures in CI. Dependency installation and browser downloads
  may still require network access.
- [x] Acceptance: routine browser suites make no requests to public websites.

### Context and browser lifecycle

- [x] Track LiveView pages, CDP sessions, and event handlers by context.
  Destroying a context removes only its own handlers.
- [x] Release browser-pool references and temporary resources after failed
  creation, page closure, browser disconnection, and context destruction.
- [x] Make repeated destruction safe.
- [x] Settle pending calls when their page or context disappears.
- [x] Acceptance: two overlapping contexts record independently when either
  closes, including during failed browser operations.

### Portal failures

- [x] Handle upstream transport failures in direct portal fulfillment and
  detours.
- [x] Fail intercepted browser requests through the appropriate CDP or HTTP
  failure path; distinguish network failures from valid HTTP error responses.
- [x] Remove request identifiers, callbacks, and pending queue entries after
  failure or cancellation.
- [x] Preserve prefix matching, per-context portal/detour settings, binary
  response handling, and cache isolation.
- [x] Acceptance: failed upstream requests, canceled navigation, client
  disconnects, and context destruction leave no indefinitely pending portal
  work; existing portal regressions remain covered.

### Flake-resistant browser calls

Follow the Cypress model for the `Browser` shim.

- [x] Retry assertions and waits until they pass or their timeout runs out, and
  retry safe reads when the page changes under them. All attempts of a call share
  its timeout.
- [x] Wait until the target of an action is visible, enabled, attached, not
  readonly when typing, not moving, and not covered. `click` accepts `force` to
  skip the checks.
- [x] Never repeat an action once it reached the page. It succeeds even if the
  page closes because of it, while work that never happened fails with
  `PageClosed`.
- [x] Pause calls while the main frame loads a new document, for up to
  `timeouts.pageLoad` milliseconds (30000 by default).
- [x] After an action, hold back the next call that does not retry on its own for
  `timeouts.actionSettle` milliseconds (20 by default, 0 turns it off), because a
  navigation can start shortly after the action returned.

### Snapshot replay and recording limits

- [x] Add GUI browser tests covering a failed run's export, import, command
  selection, frames, console output, and errors.
- [x] Cover repeated response-content references, malformed imports, and
  unsupported snapshot versions with useful errors.
- [x] Add configurable recording budgets, defaulting to 256 MiB per context and
  1 GiB across the instance, measured from encoded packet sizes.
- [x] Stop recording an affected context when a budget would be exceeded and
  emit one truncation warning. Keep retained packets intact so content references
  remain valid; browser operations continue.
- [x] Expose recording size, truncation status, active contexts, and pooled
  browsers for diagnostics.
- [x] Establish repeatable benchmarks for long runs and concurrent contexts.
  Report memory, recording size, and command latency before and after changes.
- [x] Acceptance: oversized recordings stay within configured budgets, remain
  importable, and clearly indicate missing later evidence.

## Milestone 2: MCP server

### Package and lifecycle

- [x] Create a publishable `@puth/mcp` workspace with a `puth-mcp` executable,
  built through root workspace commands.
- [x] Use the maintained TypeScript MCP SDK with stdio transport.
- [x] Connect to an existing instance through the generated `@puth/client`; never
  silently start another Puth instance.
- [x] Keep protocol traffic on stdout and diagnostics on stderr. Update client
  logging where necessary.
- [x] Give each agent session its own Puth context with recording enabled and
  portal/detours disabled in v1.
- [x] Serialize browser operations within each session while allowing separate
  sessions to run concurrently.
- [x] Close owned contexts on session closure and graceful MCP shutdown; expire
  idle sessions after 30 minutes.
- [x] Reject attachment to or destruction of contexts owned by project test
  runners.

### Puth HTTP interfaces

- [x] Add `GET /health`, returning the server version, a process-lifetime
  instance ID, and supported agent capabilities.
- [x] Add `GET /context/:id/snapshot`, returning a binary `.puth` snapshot using
  existing serialization without destroying the context.
- [x] Return structured errors for unknown or destroyed contexts.
- [x] Check session ownership in the MCP adapter before requesting a snapshot.
- [x] Preserve existing client behavior.

### MCP tools

Use explicit schemas and bounded responses for the following tools:

- [x] `puth_status`: report configured endpoint, instance ID, capabilities, and
  owned sessions.
- [x] `puth_session_create`: create an isolated session with optional initial URL
  and viewport.
- [x] `puth_session_close`: destroy an owned session; repeated closure succeeds.
- [x] `puth_navigate`: navigate the session's selected page.
- [x] `puth_pages`: list pages or select a page within the session.
- [x] `puth_inspect`: return URL, title, visible text, and bounded element
  information with selector candidates.
- [x] `puth_action`: perform a typed action: click, type, select, check, uncheck,
  keypress, or dialog interaction.
- [x] `puth_wait`: wait for visibility, disappearance, text, URL, or
  enabled/disabled state using existing Puth semantics.
- [x] `puth_assert`: execute supported Puth assertions and return observed results.
- [x] `puth_screenshot`: return an MCP image and save a local artifact.
- [x] `puth_events`: read paginated console, error, and network summaries
  belonging to the session.
- [x] `puth_export`: export a snapshot, recorded steps, or PHP/Laravel test draft.

### Tool contracts and failure handling

- [x] Define supported actions, waits, assertions, parameter validation, and
  PHP/Laravel translations in a shared operation registry.
- [x] Advertise only implemented operations; do not expose arbitrary
  remote-object invocation in v1.
- [x] Include session/page identifiers, operation outcome, available evidence,
  and truncation warnings in results where applicable.
- [x] Include a stable error code and useful message in failures. Assertion
  failures are tool errors, not successful validations.
- [x] Use a 3-second default for explicit waits and a 30-second outer operation
  deadline.
- [x] If a timed-out operation cannot be canceled safely, invalidate and destroy
  its session before accepting more commands.

### Test-authoring support

- [x] Record actions, waits, and assertions in an ordered session journal.
- [x] Export standalone PHP and Laravel PHPUnit test drafts using actual
  supported client methods.
- [x] Preserve explicit assertions. Never infer workflow success merely because
  actions completed.
- [x] Prefer existing `puth` attributes and stable selectors; identify weaker
  selector candidates.
- [x] Mark missing setup, credentials, fixture data, and unsupported translations
  as unresolved requirements.
- [x] Include cleanup and references to captured evidence.
- [x] Treat exploratory navigation and screenshots as evidence rather than
  mandatory test steps; allow callers to select journal steps for export.
- [x] Label drafts unverified until the repository's real test suite has
  executed them successfully. Exporting a draft alone never establishes a pass.
- [x] Keep source-file writes and shell execution outside the MCP server.

## Milestone 3: project integration and onboarding

### Connect to the project's development instance

- [x] Add `.mcp.json` for Claude Code, the primary client, with a stdio MCP server
  entry invoking the locally built package through a root npm script.
- [x] Add `.codex/config.toml` with the same entry for Codex.
- [x] Use `PUTH_INSTANCE_URL` for the endpoint, defaulting to
  `http://127.0.0.1:7345`.
- [x] Provide a container execution example using `http://puth:7345`.
- [x] Supply the application's browser-reachable base URL separately. Use
  `http://laravel:8080` for this repository's Compose Laravel application.
- [x] Accept environment overrides for endpoint, application URL, and artifact
  directory. Keep secrets out of committed configuration.
- [x] Store agent artifacts under ignored `.puth/agent-artifacts/`, partitioned
  by session.
- [x] Report both Puth endpoint and application URL through `puth_status`.
  Explain that the application URL is resolved from the browser's environment.
- [x] Verify connectivity through `/health`. If unavailable, report the expected
  startup command without launching another server.
- [x] Document equivalent configuration for other MCP clients.

Project-scoped configuration follows the MCP documentation of
[Claude Code](https://code.claude.com/docs/en/mcp) and
[Codex](https://developers.openai.com/codex/mcp/), and needs approval or a trusted
project before it applies.

### Agent workflow guidance

- [x] Document starting the existing Compose development environment.
- [x] Document checking the MCP connection with `puth_status`.
- [x] Document exploration and validation in an isolated session.
- [x] Document exporting a PHP or Laravel draft and writing it with normal
  editor tools.
- [x] Document running the relevant repository suite and inspecting failures
  through Puth artifacts.

### Onboarding and project documentation

- [x] Publish a runnable Laravel/PHP example demonstrating failure capture, MCP
  exploration, test authoring, and CI artifact collection.
- [x] Document MCP tools, lifecycle, configuration, artifact paths, supported
  operations, and browser-network addressing.
- [x] Replace the placeholder public roadmap with these milestones.
- [x] Publish a client support matrix based on actual test coverage, clarifying
  PHP, Laravel, Java, and JavaScript readiness.
- [x] Update `dev/TESTING.md` and Compose services together whenever changing the
  test environment.

## Verification and release checklist

- [x] Run active suites through the documented Compose environment. Direct host
  checks remain allowed when prerequisites are already available, as described
  in `AGENTS.md` and `dev/TESTING.md`.
- [x] Add stdio MCP integration coverage for initialization, discovery,
  structured results, image output, errors, shutdown, and stdout purity.
- [x] Run MCP and a Laravel test concurrently against one Puth instance. Assert
  matching instance IDs, separate contexts, and uninterrupted recording when
  either context closes.
- [x] Exercise navigation, inspection, actions, waits, assertions, screenshots,
  event pagination, and snapshot export against local fixtures.
- [x] Export PHP and Laravel drafts from known workflows, execute them through
  real test runners, and verify an intentionally incorrect assertion fails.
- [x] Import MCP-exported snapshots into the GUI and inspect the captured
  failure.
- [x] Cover disconnected servers, server restarts, stale session IDs, operation
  timeouts, recording truncation, and invalid inputs.
- [x] Add Changesets for user-facing changes to publishable packages.
- [x] Regenerate PHP, Java, and TypeScript clients whenever a server change
  affects a `@codegen` API, and inspect generated diffs.
- [ ] Publish packages only when publishing is explicitly intended.

## Defaults and boundaries

- Reliability is a prerequisite for MCP delivery.
- MCP v1 targets local development and CI with existing Puth instances.
- PHP and Laravel are the initial test-export targets.
- GUI tests use Puth itself, driving the GUI through the generated TypeScript
  client.
- HTTP MCP transport, attachment to existing test contexts, portal configuration
  through MCP, and execution of repository tests inside MCP are deferred.
- Sharing a Puth instance does not mean sharing a browser context. Agent sessions
  must remain separate from test-runner contexts.
