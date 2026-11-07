# Roadmap

Puth focuses on stable browser testing with native clients, a realtime GUI and snapshots that make failures easier to investigate.

## Reliability

- [x] Local fixtures, so browser suites make no requests to public websites
- [x] Isolated contexts, which keep recording when another one closes
- [x] Portal failures that reach the browser instead of leaving requests pending
- [x] Flake-resistant calls: retrying assertions, actionability checks, and pausing during page loads
- [x] Recording budgets, snapshot versions and useful import errors
- [x] GUI tests driven by Puth itself, and benchmarks for long runs

## Agent workflows

- [x] MCP server for exploring applications and validating behavior
- [x] PHP and Laravel test drafts, verified by the real test runners
- [x] Project configuration and documentation

## Later

- HTTP transport for the MCP server
- Attaching agents to contexts of running tests
- Portal configuration through MCP
- Running repository tests through MCP

For current development, see the [GitHub repository](https://github.com/puth-io/puth), [open issues](https://github.com/puth-io/puth/issues) and [releases](https://github.com/puth-io/puth/releases).
