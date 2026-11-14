---
'puth': minor
'@puth/gui': minor
'@puth/mcp': patch
'@puth/zstd': minor
---

Recordings are compressed with zstd: `.puth` files, the snapshot interface and the websocket, which sends the recordings a GUI connects to compressed and large packets like DOM keyframes when that saves space. A recording without frames shrinks about six times. The GUI decodes them with the new `@puth/zstd` package, zstd's own decoder built to WebAssembly, and still opens the plain msgpack files it exports itself. The MCP server reads both.
