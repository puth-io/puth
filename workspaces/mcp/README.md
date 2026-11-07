# @puth/mcp

An MCP server that gives agents isolated browser sessions on an existing Puth instance, for exploring applications,
validating behavior and drafting PHP and Laravel tests. It never starts a Puth instance, writes source files or runs
test suites.

```sh
PUTH_INSTANCE_URL=http://127.0.0.1:7345 PUTH_APP_URL=http://laravel:8080 npx @puth/mcp
```

See the [MCP guide](https://puth.io/guide/mcp) for configuration, tools and the workflow.
