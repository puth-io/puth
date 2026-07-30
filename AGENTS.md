# Puth repository guide

This is a Bun/Node monorepo. The server is `workspaces/puth`; shared code is in
`workspaces/core`; the GUI is `workspaces/gui`; client libraries live in
`workspaces/clients/`.

- Use the root workspace commands and target a package with `npm -w <package> run <script>`.
- `npm run build` builds the primary published packages. Use `npm run dev:server`,
  `npm run dev:client`, or `npm run dev` for local development.
- Keep changes scoped to the affected package and update its tests/documentation when relevant.
- Do not modify unrelated or untracked worktree files.

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
