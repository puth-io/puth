# Puth reliability and agent workflows

Status: in progress. Unchecked items are planned work, not completed capabilities.

## Goals and delivery order

Make Puth dependable for development and CI, then expose the same testing
environment to Codex and other MCP clients for validation and test authoring.

- [ ] Deliver the reliability foundation: local fixtures, context isolation,
  portal failures, snapshot replay coverage, and recording limits.
- [ ] Deliver an MCP server for browser exploration, validation, and PHP/Laravel
  test authoring.
- [ ] Configure the project MCP connection to use the Puth instance used by its
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
- [ ] Use the same fixtures in CI. Dependency installation and browser downloads
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

### Snapshot replay and recording limits

- [ ] Add GUI browser tests covering a failed run's export, import, command
  selection, frames, console output, and errors.
- [ ] Cover repeated response-content references, malformed imports, and
  unsupported snapshot versions with useful errors.
- [x] Add configurable recording budgets, defaulting to 256 MiB per context and
  1 GiB across the instance, measured from encoded packet sizes.
- [x] Stop recording an affected context when a budget would be exceeded and
  emit one truncation warning. Keep retained packets intact so content references
  remain valid; browser operations continue.
- [x] Expose recording size, truncation status, active contexts, and pooled
  browsers for diagnostics.
- [ ] Establish repeatable benchmarks for long runs and concurrent contexts.
  Report memory, recording size, and command latency before and after changes.
- [ ] Acceptance: oversized recordings stay within configured budgets, remain
  importable, and clearly indicate missing later evidence.

## Milestone 2: MCP server

### Package and lifecycle

- [ ] Create a publishable `@puth/mcp` workspace with a `puth-mcp` executable,
  built through root workspace commands.
- [ ] Use the maintained TypeScript MCP SDK with stdio transport.
- [ ] Connect to an existing instance through `@puth/client`; never silently
  start another Puth instance.
- [ ] Keep protocol traffic on stdout and diagnostics on stderr. Update client
  logging where necessary.
- [ ] Give each agent session its own Puth context with recording enabled and
  portal/detours disabled in v1.
- [ ] Serialize browser operations within each session while allowing separate
  sessions to run concurrently.
- [ ] Close owned contexts on session closure and graceful MCP shutdown; expire
  idle sessions after 30 minutes.
- [ ] Reject attachment to or destruction of contexts owned by project test
  runners.

### Puth HTTP interfaces

- [ ] Add `GET /health`, returning the server version, a process-lifetime
  instance ID, and supported agent capabilities.
- [ ] Add `GET /context/:id/snapshot`, returning a binary `.puth` snapshot using
  existing serialization without destroying the context.
- [ ] Return structured errors for unknown or destroyed contexts.
- [ ] Check session ownership in the MCP adapter before requesting a snapshot.
- [ ] Preserve existing client behavior.

### MCP tools

Use explicit schemas and bounded responses for the following tools:

- [ ] `puth_status`: report configured endpoint, instance ID, capabilities, and
  owned sessions.
- [ ] `puth_session_create`: create an isolated session with optional initial URL
  and viewport.
- [ ] `puth_session_close`: destroy an owned session; repeated closure succeeds.
- [ ] `puth_navigate`: navigate the session's selected page.
- [ ] `puth_pages`: list pages or select a page within the session.
- [ ] `puth_inspect`: return URL, title, visible text, and bounded element
  information with selector candidates.
- [ ] `puth_action`: perform a typed action: click, type, select, check, uncheck,
  keypress, or dialog interaction.
- [ ] `puth_wait`: wait for visibility, disappearance, text, URL, or
  enabled/disabled state using existing Puth semantics.
- [ ] `puth_assert`: execute supported Puth assertions and return observed results.
- [ ] `puth_screenshot`: return an MCP image and save a local artifact.
- [ ] `puth_events`: read paginated console, error, and network summaries
  belonging to the session.
- [ ] `puth_export`: export a snapshot, recorded steps, or PHP/Laravel test draft.

### Tool contracts and failure handling

- [ ] Define supported actions, waits, assertions, parameter validation, and
  PHP/Laravel translations in a shared operation registry.
- [ ] Advertise only implemented operations; do not expose arbitrary
  remote-object invocation in v1.
- [ ] Include session/page identifiers, operation outcome, available evidence,
  and truncation warnings in results where applicable.
- [ ] Include a stable error code and useful message in failures. Assertion
  failures are tool errors, not successful validations.
- [ ] Use a 3-second default for explicit waits and a 30-second outer operation
  deadline.
- [ ] If a timed-out operation cannot be canceled safely, invalidate and destroy
  its session before accepting more commands.

### Test-authoring support

- [ ] Record actions, waits, and assertions in an ordered session journal.
- [ ] Export standalone PHP and Laravel PHPUnit test drafts using actual
  supported client methods.
- [ ] Preserve explicit assertions. Never infer workflow success merely because
  actions completed.
- [ ] Prefer existing `puth` attributes and stable selectors; identify weaker
  selector candidates.
- [ ] Mark missing setup, credentials, fixture data, and unsupported translations
  as unresolved requirements.
- [ ] Include cleanup and references to captured evidence.
- [ ] Treat exploratory navigation and screenshots as evidence rather than
  mandatory test steps; allow callers to select journal steps for export.
- [ ] Label drafts unverified until the repository's real test suite has
  executed them successfully. Exporting a draft alone never establishes a pass.
- [ ] Keep source-file writes and shell execution outside the MCP server.

## Milestone 3: project integration and onboarding

### Connect to the project's development instance

- [ ] Add `.codex/config.toml` with a stdio MCP server entry invoking the locally
  built package through a root npm script.
- [ ] Use `PUTH_INSTANCE_URL` for the endpoint, defaulting to
  `http://127.0.0.1:7345`.
- [ ] Provide a container execution example using `http://puth:7345`.
- [ ] Supply the application's browser-reachable base URL separately. Use
  `http://laravel:8080` for this repository's Compose Laravel application.
- [ ] Accept environment overrides for endpoint, application URL, and artifact
  directory. Keep secrets out of committed configuration.
- [ ] Store agent artifacts under ignored `.puth/agent-artifacts/`, partitioned
  by session.
- [ ] Report both Puth endpoint and application URL through `puth_status`.
  Explain that the application URL is resolved from the browser's environment.
- [ ] Verify connectivity through `/health`. If unavailable, report the expected
  startup command without launching another server.
- [ ] Document equivalent configuration for other MCP clients.

Project-scoped Codex configuration follows the
[official MCP documentation](https://developers.openai.com/codex/mcp/) and applies
to trusted projects.

### Agent workflow guidance

- [ ] Document starting the existing Compose development environment.
- [ ] Document checking the MCP connection with `puth_status`.
- [ ] Document exploration and validation in an isolated session.
- [ ] Document exporting a PHP or Laravel draft and writing it with normal
  editor tools.
- [ ] Document running the relevant repository suite and inspecting failures
  through Puth artifacts.

### Onboarding and project documentation

- [ ] Publish a runnable Laravel/PHP example demonstrating failure capture, MCP
  exploration, test authoring, and CI artifact collection.
- [ ] Document MCP tools, lifecycle, configuration, artifact paths, supported
  operations, and browser-network addressing.
- [ ] Replace the placeholder public roadmap with these milestones.
- [ ] Publish a client support matrix based on actual test coverage, clarifying
  PHP, Laravel, Java, and JavaScript readiness.
- [ ] Update `dev/TESTING.md` and Compose services together whenever changing the
  test environment.

## Verification and release checklist

- [ ] Run active suites through the documented Compose environment. Direct host
  checks remain allowed when prerequisites are already available, as described
  in `AGENTS.md` and `dev/TESTING.md`.
- [ ] Add stdio MCP integration coverage for initialization, discovery,
  structured results, image output, errors, shutdown, and stdout purity.
- [ ] Run MCP and a Laravel test concurrently against one Puth instance. Assert
  matching instance IDs, separate contexts, and uninterrupted recording when
  either context closes.
- [ ] Exercise navigation, inspection, actions, waits, assertions, screenshots,
  event pagination, and snapshot export against local fixtures.
- [ ] Export PHP and Laravel drafts from known workflows, execute them through
  real test runners, and verify an intentionally incorrect assertion fails.
- [ ] Import MCP-exported snapshots into the GUI and inspect the captured
  failure.
- [ ] Cover disconnected servers, server restarts, stale session IDs, operation
  timeouts, recording truncation, and invalid inputs.
- [ ] Add Changesets for user-facing changes to publishable packages.
- [ ] Regenerate PHP and Java clients whenever a server change affects a
  `@codegen` API, and inspect generated diffs.
- [ ] Publish packages only when publishing is explicitly intended.

## Defaults and boundaries

- Reliability is a prerequisite for MCP delivery.
- MCP v1 targets local development and CI with existing Puth instances.
- PHP and Laravel are the initial test-export targets.
- HTTP MCP transport, attachment to existing test contexts, portal configuration
  through MCP, and execution of repository tests inside MCP are deferred.
- Sharing a Puth instance does not mean sharing a browser context. Agent sessions
  must remain separate from test-runner contexts.
