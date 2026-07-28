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
