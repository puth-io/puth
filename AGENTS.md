# Puth repository guide

This is a Bun/Node monorepo. The server is `workspaces/puth`; shared code is in
`workspaces/core`; the GUI is `workspaces/gui`; client libraries live in
`workspaces/clients/`.

- Use the root workspace commands and target a package with `npm -w <package> run <script>`.
- `npm run build` builds the primary published packages. Use `npm run dev:server`,
  `npm run dev:client`, or `npm run dev` for local development.
- Keep changes scoped to the affected package and update its tests/documentation when relevant.
- Do not modify unrelated or untracked worktree files.

## Test environment

Use `compose.yml` for the complete test environment. npm builds and tests may also
run directly on the host when a compatible Node version and the required
dependencies are available. Browser tests additionally need a usable Chrome
installation and its system libraries; use Compose when these are unavailable.
Do not install PHP, Maven, or Chrome system libraries on the host to run this
repository's tests. Docker with Compose remains sufficient for the full suite.

- Full active test suites: `./docker/dev/test.sh`.
- Setup or restart the test environment: `docker compose up --build --wait puth laravel`.
- Run a focused suite with `docker compose run --rm --no-deps <suite> ...` after setup.
- For direct npm tests, use root workspace commands, for example
  `npm -w puth run test -- test/utils/cy.test.ts`.
- Read [dev/TESTING.md](dev/TESTING.md) for suite names, filters, prerequisites,
  logs, and cleanup. Keep that guide and Compose services in sync when changing
  the test environment.
- If container setup fails, diagnose and fix the Compose environment instead of
  installing host tools to bypass it. Direct npm tests are still allowed when their
  prerequisites are already available. Report network-policy blockers without
  weakening TLS verification or changing unrelated worktree files.

## Releases

Releases use Changesets. For every user-facing change to a publishable package,
add a Changeset describing the package and version bump. Run `npm run release`
only when publishing is intended; it executes `changeset publish`.

## Portal and detours

Portal support lets a browser request be intercepted and sent to the connected
client for handling. It is configured per context through
`supports.portal.urlPrefixes`; only requests matching a configured prefix are
handled, while all other paused requests continue normally.

- `portal` is a per-context boolean option, enabled by default. Set it to
  `false` to disable portal interception entirely; no CDP Fetch interception is
  installed for that context.
- `detour` is a per-context boolean option, also enabled by default. It is the
  fallback for portal requests whose POST body cannot be read directly (for
  example, oversized or multipart requests). Set it to `false` to keep normal
  portal handling but prevent that request from being rerouted through
  `/portal/detour`.
- Contexts expose `enablePortal()`, `disablePortal()`, `enableDetour()`, and
  `disableDetour()` to change these settings after creation. The Laravel test
  client creates contexts with both `portal` and `detour` set to `false`; a
  value returned by `getContextOptions()` overrides those defaults.

## Client code generation

`@codegen` marks server-side remote APIs for generation. Add it immediately
above a public `Context`/shim method (or to a root class comment) when that API
must be exposed to generated PHP and Java remote-object clients. Keep generated
methods simple and use explicit TypeScript parameter and return types when
possible.

After changing a `@codegen` API, run `node bin/codegen-clients.js`. It rewrites
the generated PHP and Java remote-object classes, so inspect the diff and keep
only intentional generated changes. Do not hand-maintain generated methods;
make the change in the server source and regenerate. The Java generator uses a
Node-compatible ESM import, so run it with Node unless the project specifically
requires Bun.
