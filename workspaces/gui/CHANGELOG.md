# @puth/gui

## 0.4.0

### Minor Changes

- 9dcb07c: The DOM recording includes iframes, also of other sites and nested in each other, and the GUI shows them in place. Typed values in frames of another origin than a page above them are masked, like payment fields.
- 720449a: Snapshots record the DOM of each page, and the GUI shows a step's Before and After rebuilt from it instead of the nearest frame: exact to the command, with the page's stylesheets, fonts and images served from the recording, without running scripts or loading anything from the network. Frames stay available through **Frame**. Set the context option `dom` to `false` to record frames only. Password and card number fields are masked.
  
  The snapshot format is version 2. The GUI no longer opens snapshots saved by earlier versions.
- 78ecfc2: Recorded frames are off by default, since the GUI shows the recorded DOM. Turn them on with the context option `frames`, with `Context.enableFrames()` and `disableFrames()` while a test runs, or in Laravel with the `PuthEnableFrames` trait. MCP sessions keep recording them, and `puth_context` takes the last address from the recorded navigations. Frames are stored as Chrome sends them and the GUI crops them to the viewport, so Puth no longer depends on `sharp`.
- 409b86e: Recordings are compressed with zstd: `.puth` files, the snapshot interface and the websocket, which sends the recordings a GUI connects to compressed and large packets like DOM keyframes when that saves space. A recording without frames shrinks about six times. The GUI decodes them with the new `@puth/zstd-decoder` package, zstd's own decoder built to WebAssembly, and compresses the snapshots it exports with the new `@puth/zstd-encoder` package, which it loads only when something is exported. Uncompressed snapshots still open in the GUI and the MCP server.

## 0.3.0

### Minor Changes

- 0f79d22: The GUI runs on React 19, Tailwind CSS 4 and Vite 8. Colors come from the OKLCH palette of Tailwind CSS 4 and are a little more vivid; placeholders, borders and the pointer cursor on buttons look as before. Snapshot import accepts `.puth` files through the file dialog as before.

## 0.2.1

### Patch Changes

- dda5c04: The Docker image moved to the GitHub Container Registry: `ghcr.io/puth-io/puth`. New versions are no longer published to Docker Hub.

## 0.2.0

### Minor Changes

- aac19a4: Redesign the GUI. A side rail replaces the header, and the test run, its history and the viewport sit in three columns. Steps keep the console output they caused, a failed test opens with a summary that leads to the failing step, and arrow keys move between steps and switch between before and after. The rail links to the documentation, and the empty state to the guides for getting started and CI snapshots. Geist and JetBrains Mono are bundled, so the GUI still loads nothing from other hosts.
- aac19a4: Watch agents in the GUI. The new Agents view lists sessions of the MCP server, live ones first, and tests an agent took over. Steps are grouped by tool call, drafts appear next to the steps they were made of, and what the server does for itself, such as reading the page outline, is left out. Follow keeps the newest step selected. Puth records `handoff` packets when a test waits for, is claimed by and gets back its browser, and contexts accept `annotate()` marks, which the MCP server sends.

  Steps are numbered, colored by what they do (open a page, act, check or read), and split by dividers into the pages they ran on. Puth records a `navigation` packet when the main frame navigates, also within the document, and when `setContent` sets a page, with its title. Each step is one line, and its full arguments, a console message or a request show up when the mouse rests on it. Durations only show where they matter. Console output and requests sit collapsed between the steps they followed, and failed requests appear in the failure summary and a Network tab.

### Patch Changes

- 50a59a4: Version snapshots and show why an import failed. Importing a damaged file used to leave the GUI on "Importing snapshot..." forever, and rejected files only logged to the console. Files without a version keep importing as version 1.
- 0759ec8: Stop loading fonts from Google. Icons are now inline SVGs and text uses the system font, so the GUI works without internet access.

## 0.1.4

### Patch Changes

- c9ce01c: Build the GUI without requiring Core's generated runtime entry point during publishing, and release Puth so its Docker image includes the GUI update.

## 0.1.3

### Patch Changes

- de2f1f5: Deduplicate identical recorded response bodies in snapshots, resolve their references in the GUI, and add Laravel Dusk-compatible `assertCount` support.

## 0.1.2

### Patch Changes

- 9a0fd5c: updates for release

## 0.1.1

### Patch Changes

- eac694f: update dependencies, small bug fixes

## 0.1.0

### Minor Changes

- d4f0513: gui v2
