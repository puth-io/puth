---
title: MCP server
description: Explore applications and draft tests with agents.
---

# MCP server

`@puth/mcp` lets Claude Code, Codex and other MCP clients use a browser through Puth: explore an application, validate behavior, and draft PHP or Laravel tests. Agents keep using their own editor and terminal tools to write files and run test suites.

It connects to a running Puth instance and never starts one. Each agent session gets its own context, so it can share an instance with test runners without affecting them.

## Setup

Start Puth, then point your MCP client at the server over stdio.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUTH_INSTANCE_URL` | `http://127.0.0.1:7345` | Puth instance to connect to |
| `PUTH_APP_URL` | none | Base for relative URLs |
| `PUTH_ARTIFACT_DIR` | `.puth/agent-artifacts` | Screenshots and snapshots, in one folder per session |

Keep secrets out of committed configuration. Add the artifact directory to your `.gitignore`.

### Addressing

The two URLs are resolved in different places:

- `PUTH_INSTANCE_URL` is used by the MCP server, so it must be reachable from where the server runs.
- `PUTH_APP_URL` is opened by **the browser**, so it must be reachable from where Puth runs Chrome. If Puth runs in a container, `http://localhost:8000` points at that container.

In this repository's Compose environment:

| MCP server runs | `PUTH_INSTANCE_URL` | `PUTH_APP_URL` |
| --- | --- | --- |
| On the host | `http://127.0.0.1:7345` | `http://laravel:8080` |
| In a Compose service | `http://puth:7345` | `http://laravel:8080` |

`puth_status` reports both, along with the instance it reached.

### Claude Code

This repository includes `.mcp.json`, which [Claude Code](https://code.claude.com/docs/en/mcp) picks up automatically and asks you to approve on first use. It runs the locally built package, so run `npm run build` first. The variables above can be overridden from your environment:

```json
{
  "mcpServers": {
    "puth": {
      "type": "stdio",
      "command": "npm",
      "args": ["--silent", "--prefix", "${CLAUDE_PROJECT_DIR:-.}", "run", "mcp"],
      "env": {
        "PUTH_INSTANCE_URL": "${PUTH_INSTANCE_URL:-http://127.0.0.1:7345}",
        "PUTH_APP_URL": "${PUTH_APP_URL:-http://laravel:8080}",
        "PUTH_ARTIFACT_DIR": "${PUTH_ARTIFACT_DIR:-.puth/agent-artifacts}"
      }
    }
  }
}
```

Keep `--silent`: npm would otherwise print to stdout, which belongs to the protocol. Check the connection with `claude mcp get puth`.

To use Puth in your own project, add it with the published package:

```sh
claude mcp add --scope project puth -e PUTH_APP_URL=http://localhost:8000 -- npx @puth/mcp
```

### Codex

This repository also includes `.codex/config.toml`, which [Codex](https://developers.openai.com/codex/mcp/) applies to trusted projects. It starts the same server and forwards the variables above when they are set:

```toml
[mcp_servers.puth]
command = "npm"
args = ["--silent", "run", "mcp"]
env_vars = ["PUTH_INSTANCE_URL", "PUTH_APP_URL", "PUTH_ARTIFACT_DIR"]
```

### Other MCP clients

Most clients take the same command and environment, usually in a form like this:

```json
{
  "mcpServers": {
    "puth": {
      "command": "npx",
      "args": ["@puth/mcp"],
      "env": {
        "PUTH_INSTANCE_URL": "http://127.0.0.1:7345",
        "PUTH_APP_URL": "http://localhost:8000"
      }
    }
  }
}
```

To run it in a container next to Puth, set `PUTH_INSTANCE_URL=http://puth:7345`.

## Workflow

1. Start the environment: `docker compose up --build --wait puth laravel`.
2. Call `puth_status` to check the connection. If Puth is not reachable, it reports the command above and starts nothing.
3. Explore in a session: `puth_session_create`, then `puth_inspect`, `puth_action`, `puth_wait`, `puth_assert`, `puth_screenshot` and `puth_events`.
4. Call `puth_export` with `laravel` or `php`, resolve what it lists as `unresolved`, and write the file with your normal tools.
5. Run the relevant test suite. If it fails, inspect the failure through its `.puth` snapshot.
6. Close the session with `puth_session_close`.

An exported draft is **unverified** until the real test suite has run it. Exporting alone never establishes that a test passes.

See the [Laravel example](./example-laravel) for a complete run.

## Tools

| Tool | Purpose |
| --- | --- |
| `puth_status` | Endpoint, application URL, instance, capabilities and sessions |
| `puth_session_create` | Create a session, with an optional initial URL and viewport |
| `puth_session_close` | Destroy a session. Closing it again succeeds |
| `puth_navigate` | Navigate the selected page |
| `puth_pages` | List pages, or select the one later tools use |
| `puth_inspect` | URL, title, visible text and interactive elements with selector candidates |
| `puth_action` | Perform one action |
| `puth_wait` | Wait for a condition |
| `puth_assert` | Check something. A failed assertion is a tool error |
| `puth_screenshot` | Return an image and save it as an artifact |
| `puth_events` | Page through `console`, `errors` or `network` events of the session |
| `puth_export` | Export a `snapshot`, the recorded `steps`, or a `php` or `laravel` draft |

### Operations

`puth_action`, `puth_wait` and `puth_assert` take an `operation` with its parameters and an optional `timeout` in milliseconds, 3000 by default and up to 25000. Only these operations exist, there is no way to run arbitrary code.

| Tool | Operations |
| --- | --- |
| `puth_action` | `click`, `type`, `select`, `check`, `uncheck`, `keypress`, `dialog` |
| `puth_wait` | `waitForVisible`, `waitForMissing`, `waitForText`, `waitForTextMissing`, `waitForUrl`, `waitForEnabled`, `waitForDisabled` |
| `puth_assert` | `see`, `dontSee`, `seeIn`, `title`, `urlIs`, `pathIs`, `visible`, `missing`, `value`, `checked`, `notChecked`, `count` |

```json
{ "sessionId": "...", "assertion": { "operation": "seeIn", "selector": "#status", "text": "Saved", "timeout": 5000 } }
```

They behave like [Browser calls](./waiting-and-sync#automatic-waiting): actions wait until their target can be acted on and are never repeated, and assertions retry until they pass or time out.

### Results and errors

Results include the session, page, URL, title and any warnings, such as an open dialog or a recording that reached its budget. Failures are tool errors with a stable `error.code`:

| Code | Meaning |
| --- | --- |
| `ASSERTION_FAILED`, `WAIT_FAILED`, `ACTION_FAILED` | The operation could not pass in time |
| `DIALOG_OPEN` | A dialog blocks the page, answer it with the `dialog` action |
| `PAGE_CLOSED` | The page closed before the operation could finish |
| `INSTANCE_UNAVAILABLE` | No Puth instance answers |
| `SESSION_NOT_FOUND`, `SESSION_CLOSED` | The session is unknown to this server, or gone |
| `SESSION_LOST` | The instance does not know the session anymore, it probably restarted |
| `OPERATION_TIMEOUT`, `SESSION_INVALIDATED` | See [lifecycle](#lifecycle) |
| `INVALID_REQUEST`, `OPERATION_FAILED` | The request can not be served, or something else went wrong |

## Lifecycle

- Sessions record with snapshots enabled and have portal and detours disabled.
- Operations of one session run one at a time, separate sessions run concurrently. Send calls one after the other if their order matters.
- A session closes when the MCP server shuts down, and after 30 idle minutes.
- An operation has 30 seconds to finish. If it does not, its state is unknown, so the session is closed rather than left in an unknown state.
- The server only accepts sessions it created. It can not attach to or destroy contexts of test runners.

## Test drafts

`puth_export` builds a draft from the journal of passed actions, waits and assertions, or from the steps you select with `steps`. Inspections and screenshots are evidence, not test steps.

- Explicit assertions are kept, and nothing is inferred. A workflow without assertions is reported, because that test would verify nothing.
- `unresolved` lists what the draft can not know, such as data the session relied on. Values typed into credential fields are replaced by the `PUTH_TEST_SECRET` environment variable.
- `selectorWarnings` lists selectors weaker than `puth` or `data-testid` attributes, which `puth_inspect` prefers.

This repository runs exported drafts through its real test runners in `docker/dev/test-mcp-drafts.sh`, and checks that a wrong assertion fails.
