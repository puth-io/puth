# @puth/zstd-decoder

## 0.1.0

### Minor Changes

- 409b86e: Recordings are compressed with zstd: `.puth` files, the snapshot interface and the websocket, which sends the recordings a GUI connects to compressed and large packets like DOM keyframes when that saves space. A recording without frames shrinks about six times. The GUI decodes them with the new `@puth/zstd-decoder` package, zstd's own decoder built to WebAssembly, and compresses the snapshots it exports with the new `@puth/zstd-encoder` package, which it loads only when something is exported. Uncompressed snapshots still open in the GUI and the MCP server.
