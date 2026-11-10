# Remove the roadmap from the docs

Delete the public roadmap page. Planned work is tracked in `dev/specs` and in
GitHub issues, and the page only repeats what the changelogs already say.

This spec reads "docs/roadmap" as the page `workspaces/docs/guide/roadmap.md`,
not the `origin/docs` branch.

## Work

- [ ] Delete `workspaces/docs/guide/roadmap.md`.
- [ ] `workspaces/docs/.vitepress/config.ts`: remove the sidebar group
  `Project`, whose only item is the roadmap.
- [ ] `workspaces/docs/README.md`: drop "and roadmap context" from the
  description of the guide.

No other page links to `/guide/roadmap`, and the docs tests (`sdk.test.ts`,
`search.test.ts`) do not mention it. `dev/specs/reliability-and-mcp.md` has a
completed item about the roadmap, which stays as history.

## What gets lost

The page lists two items under "Later":

- HTTP transport for the MCP server. Covered by
  [mcp-h3-transport.md](mcp-h3-transport.md).
- Running repository tests through MCP. Not tracked anywhere else. Open an
  issue for it, or drop it on purpose.

`https://puth.io/guide/roadmap` will return 404. The docs intentionally keep no
redirects for old URLs.

## Acceptance

- The docs build and their tests pass.
- `git grep -i roadmap -- workspaces/docs` finds nothing.
