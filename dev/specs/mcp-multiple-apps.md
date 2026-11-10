# MCP: several applications in one repository

Let one `@puth/mcp` server work with a monorepo that has more than one
application, each with its own URL.

## Today

The server knows one application, `PUTH_APP_URL` (`config.appUrl`). It is used
in four places:

- `resolveUrl` in `server.ts` resolves relative URLs of `puth_session_create`
  and of the `visit` and `waitUrl` steps against it.
- `puth_status` prints it.
- `createDraft` in `drafts.ts` turns absolute URLs back into paths for Laravel
  drafts, and flags URLs outside of it.
- The root `package.json` script `mcp`, `.mcp.json` and `.codex/config.toml`
  set it for this repository.

In a monorepo an agent has to use absolute URLs for every application but one,
and exported Laravel drafts for those contain absolute URLs.

## Target

Applications have names. A session belongs to one application, and everything
relative in that session resolves against it.

### Configuration

```sh
PUTH_APP_URLS="shop=http://shop:8080 admin=http://admin:8080"
```

- Entries are `name=url`, separated by whitespace or commas. Names match
  `[a-z0-9_-]+`. An invalid entry stops the server with a message that names it.
- The first entry is the default application.
- `PUTH_APP_URL` keeps working and defines an application named `default`. If
  both are set, `PUTH_APP_URL` is the default and the others are added.
- `Config.appUrl` becomes `Config.apps: { name, url }[]`.

An environment variable was chosen over a config file because every MCP client
can already set one, and the server has no notion of a project root.

### Tools

- `puth_session_create` gets an optional `app`. Without it the default is used.
  An unknown name fails with `INVALID_REQUEST` and lists the known names.
- The session stores its application. `visit` and `waitUrl` resolve against it,
  and `puth_export` passes it to `createDraft`.
- A session created with an absolute `url` and no `app` gets the application
  whose URL is a prefix of it, otherwise the default.
- A session that takes over a test with `handoff` gets the application matching
  the URL of the page it took over, by the same rule.
- `puth_status` prints one `app` line per application and marks the default.
  The note about relative URLs is printed once.
- `puth_status` lists each session with its application when more than one is
  configured. Otherwise the output stays as it is, to keep results short.

Switching the application inside a session is not supported. A second session
is cheap and keeps exported drafts unambiguous.

## Decisions to confirm

1. **Format.** `name=url` pairs as above, or JSON in the variable. Recommended:
   pairs, since JSON needs escaping inside `.mcp.json`.
2. **Test location per application.** Drafts do not say where to save them. A
   third field per application (`shop=http://shop:8080=apps/shop`) could let
   `puth_export` name the directory. Recommended: leave it out until it is
   missed, the agent knows the repository.
3. **Start hint.** `errors.ts` hardcodes
   `docker compose up --build --wait puth laravel`, which is only right for this
   repository. Recommended: a `PUTH_START_HINT` variable, done together with
   this change because monorepos hit it first.

## Work

- [ ] `config.ts`: parse `PUTH_APP_URLS`, keep `PUTH_APP_URL`.
- [ ] `sessions.ts`: store the application on the session.
- [ ] `server.ts`: `app` parameter, per-session `resolveUrl`, status output.
- [ ] `drafts.ts` needs no change, it already takes `appUrl` as an option.
- [ ] Tests in `workspaces/puth/test/mcp/server.test.ts` with `fixtureUrl()`
  and `fixtureAltUrl()` as two applications: default, named, unknown name,
  absolute URL matching, handoff matching, and a Laravel draft from the second
  application with relative paths.
- [ ] `workspaces/docs/guide/mcp.md` (variable table, addressing section),
  `.claude/skills/puth/SKILL.md`, `workspaces/mcp/README.md`.
- [ ] Changeset for `@puth/mcp`, minor.

If [mcp-h3-transport.md](mcp-h3-transport.md) lands first, one server can serve
several projects. The applications then still come from the server's
environment, and this spec does not change.

## Acceptance

- With only `PUTH_APP_URL` set, every existing test passes unchanged and tool
  output is identical.
- With two applications, an agent can open a session per application using
  relative URLs only, and both exported Laravel drafts contain relative paths.
