# @puth/mcp

## 0.1.0

### Minor Changes

- 201e0a4: Add an MCP server for exploring applications and authoring tests. Agents get isolated browser sessions on an existing Puth instance, can take over tests that call `handoff()`, read what any test on the instance recorded, and export unverified PHP and Laravel test drafts. Results are compact and report what changed on the page.
- aac19a4: Watch agents in the GUI. The new Agents view lists sessions of the MCP server, live ones first, and tests an agent took over. Steps are grouped by tool call, drafts appear next to the steps they were made of, and what the server does for itself, such as reading the page outline, is left out. Follow keeps the newest step selected. Puth records `handoff` packets when a test waits for, is claimed by and gets back its browser, and contexts accept `annotate()` marks, which the MCP server sends.

  Steps are numbered, colored by what they do (open a page, act, check or read), and split by dividers into the pages they ran on. Puth records a `navigation` packet when the main frame navigates, also within the document, and when `setContent` sets a page, with its title. Each step is one line, and its full arguments, a console message or a request show up when the mouse rests on it. Durations only show where they matter. Console output and requests sit collapsed between the steps they followed, and failed requests appear in the failure summary and a Network tab.

### Patch Changes

- 5c4fecd: Report the result of a test after releasing its handoff, list test classes in `puth_contexts`, show one command with its full arguments in `puth_context`, and summarize failures in the order they happened. Commands that test runners make around a test are left out unless `all` is set.
- cf13b4d: Say when a `puth_inspect` search found nothing, and add the `textIs` step for exact text.
- Updated dependencies [cf13b4d]
- Updated dependencies [8903ec4]
- Updated dependencies [33dc85c]
- Updated dependencies [e0c9813]
- Updated dependencies [e6f04bb]
- Updated dependencies [e9aa8d8]
- Updated dependencies [1fc99c3]
  - @puth/client@0.1.0
