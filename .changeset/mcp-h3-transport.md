---
'@puth/mcp': minor
---

Implement the protocol without `@modelcontextprotocol/sdk`, which brought 17 dependencies for features the server does not use. The server answers the same tools with the same schemas over stdio, which stays the default. `puth-mcp --http` serves them over Streamable HTTP at `http://127.0.0.1:7346/mcp` with H3, configured with `PUTH_MCP_HOST`, `PUTH_MCP_PORT` and `PUTH_MCP_ORIGINS`, and `createMcpApp(config)` returns that app. An unknown tool is now a JSON-RPC error instead of a tool result, and `serverInfo.version` reports the package version.
