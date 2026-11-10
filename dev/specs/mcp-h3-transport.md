# MCP: replace the SDK with an H3 implementation

Drop `@modelcontextprotocol/sdk` from `@puth/mcp` and implement the part of the
protocol the server uses, served over HTTP with H3.

## Today

`@puth/mcp` uses three things of the SDK:

- `McpServer` with `registerTool(name, { description, inputSchema }, handler)`
  for 11 tools, and `instructions`.
- The conversion of the zod input shapes to JSON Schema for `tools/list`, and
  input validation in `tools/call`.
- `StdioServerTransport` in `cli.ts`.

Tool results are `text` and `image` content, with `isError` on failures.

The SDK (1.32.2) is 8.9 MB and brings 17 dependencies, among them `express`,
`hono`, `jose`, `ajv` and `cors`, for OAuth, SSE, resources, prompts and
sampling, none of which are used. `puth` already depends on `h3` 2 (beta).

The SDK client is also used by `workspaces/puth/test/mcp/server.test.ts`,
`dev/mcp/export-drafts.ts`, `dev/mcp/take-over-test.ts` and
`dev/gui-scenarios.mjs` (`connect`, `listTools`, `callTool`, `getInstructions`,
`close`).

## Target

### Protocol

A dispatcher for JSON-RPC 2.0 that is independent of the transport:

| Message | Behavior |
| --- | --- |
| `initialize` | Answer with the requested protocol version if supported, otherwise the newest supported one; `capabilities: { tools: {} }`, `serverInfo`, `instructions`. |
| `notifications/initialized`, `notifications/cancelled` | Accept, do nothing. |
| `ping` | Empty result. |
| `tools/list` | All tools with `name`, `description`, `inputSchema`. No pagination. |
| `tools/call` | Validate the arguments with zod, run the handler. Invalid arguments are a tool result with `isError`, like other tool failures. An unknown tool is error `-32602`. |
| any other request | Error `-32601`. Other notifications are ignored. |

Parse errors are `-32700`, invalid requests `-32600`. Batches are answered if
the negotiated protocol version has them.

Not implemented: resources, prompts, sampling, elicitation, roots, logging,
completions, progress, list-changed notifications, authorization.

`serverInfo.version` comes from `package.json`, it is `0.0.0` today.

### JSON Schema

zod 3.25 ships `zod/v4` with `z.toJSONSchema`. Move the schemas to it, which
removes the need for `zod-to-json-schema`. If that turns out not to work for
`stepSchema`, write the schemas as JSON Schema and keep zod for validation only.
A test compares the `tools/list` output with a stored copy of what the SDK
produces today, so agents see the same schemas.

### HTTP transport (H3)

Streamable HTTP, reduced to what a server without server-initiated messages
needs:

- `POST /mcp` with one JSON-RPC message. Requests are answered with
  `application/json`, notifications with `202` and no body.
- `GET /mcp` answers `405`: there is no stream to open.
- No SSE and no resumability.
- The `Origin` header is checked against an allow list, by default only
  loopback origins, and requests without `Origin` pass. This is the DNS
  rebinding protection the specification requires.
- Listens on `127.0.0.1` by default. `PUTH_MCP_HOST` and `PUTH_MCP_PORT`
  (default `7346`) change that.

`@puth/mcp` exports `createMcpApp(config)` returning the H3 app, and
`puth-mcp` serves it.

## Decisions to confirm

1. **Does stdio stay?** The dispatcher makes stdio about 30 lines
   (newline-delimited JSON on stdin and stdout). Recommended: keep it as the
   default of `puth-mcp`, and serve HTTP with `puth-mcp --http`. With stdio the
   MCP client starts and stops the server. With HTTP only, somebody has to start
   it before the agent, and `.mcp.json`, `.codex/config.toml` and the docs all
   change. If "H3 implementation" means HTTP only, remove stdio and add the
   server to `compose.yml`.
2. **Where the HTTP server runs.** Recommended: its own process on the machine
   of the agent. Tools read and write local paths (`PUTH_ARTIFACT_DIR`, `file`
   of the upload step, `file` of `puth_context`), which only mean something
   there. Mounting `createMcpApp` at `/mcp` inside the Puth instance is possible
   later, but breaks those paths when Puth runs in a container.
3. **MCP sessions.** Recommended: stateless, no `Mcp-Session-Id`. Browser
   sessions are already addressed by `sessionId` and closed after
   `PUTH_MCP_IDLE_TIMEOUT`. The cost: with several agents on one HTTP server,
   `puth_status` shows the browser sessions of all of them.
4. **Tests.** Recommended: keep the SDK as a devDependency at the repository
   root and use its client in tests and `dev/` scripts. An independent client
   proves the implementation against the real protocol. A handwritten test
   client would only prove it against our reading of it.

## Work

- [ ] `src/protocol.ts`: dispatcher, tool registry, error codes.
- [ ] `src/http.ts`: H3 app as above. `src/stdio.ts` if decision 1 keeps it.
- [ ] `server.ts`: replace `McpServer` with the registry, keep the `tool()`
  helper and all handlers as they are.
- [ ] `cli.ts`: pick the transport, keep the shutdown that closes all sessions.
- [ ] `package.json`: remove the SDK, add `h3` with the range `puth` uses.
- [ ] Tests: run the existing MCP suite over every transport that ships, plus
  protocol tests for version negotiation, unknown method, invalid JSON, a
  rejected `Origin`, and the stored `tools/list` schemas.
- [ ] Check with Claude Code and Codex against the Compose environment.
- [ ] `workspaces/docs/guide/mcp.md`, `workspaces/mcp/README.md`, `AGENTS.md`
  and the client configuration files, as far as the decisions change them.
- [ ] Changeset for `@puth/mcp`: minor if stdio stays the default, otherwise
  mark it as breaking.

Verify the list of supported protocol versions and the exact Streamable HTTP
rules against the current MCP specification when implementing. This file
describes them from the SDK version in use.

## Acceptance

- `npm ls --omit=dev -w @puth/mcp` shows no `@modelcontextprotocol/sdk`,
  `express` or `hono`.
- The existing MCP tests pass with unchanged assertions on tool output.
- `tools/list` returns the same schemas as before.
- Claude Code and Codex list the tools and complete the workflow of
  `.claude/skills/puth`.
