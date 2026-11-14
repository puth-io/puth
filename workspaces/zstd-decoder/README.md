# @puth/zstd-decoder

zstd's decoder, built to WebAssembly from the official zstd release, with a TypeScript wrapper that checks
every result. It only decodes; it can't compress. Puth's GUI reads recordings with it.

```ts
import { createZstdDecoder } from '@puth/zstd-decoder';
import wasmUrl from '@puth/zstd-decoder/zstd-decoder.wasm?url';

const decode = await createZstdDecoder(await (await fetch(wasmUrl)).arrayBuffer(), { maxSize: 512 * 1024 * 1024 });
const bytes = decode(compressed);
```

The wrapper throws for input that is not a valid zstd stream, and never decodes more than `maxSize` bytes,
whatever size a frame claims. Frames without a content size, as streaming compressors write them, are decoded
as a stream. `npm -w @puth/zstd-decoder run test` checks this with Node's zstd.

## Why an own build

zstd publishes no WebAssembly build. Its releases contain signed source tarballs and Windows binaries, and the
repository has a script that combines the decoder into one C file (`build/single_file_libs`), which zstd's own
tests compile to WebAssembly. The JavaScript packages that wrap such a build were either large, or, like
`zstddec`, returned whatever was in memory instead of an error for broken input, which for files users drop into
the GUI could even be a previously opened recording.

`zstd-decoder.wasm` imports nothing, so it can't reach anything outside its own memory. It exports the decoder
functions, `malloc` and `free`:

```
ZSTD_isError ZSTD_getErrorName ZSTD_getFrameContentSize ZSTD_decompress ZSTD_createDStream ZSTD_freeDStream
ZSTD_initDStream ZSTD_decompressStream ZSTD_DStreamInSize ZSTD_DStreamOutSize malloc free memory
```

| | |
| --- | --- |
| zstd | 1.5.7, `zstd-1.5.7.tar.gz`, SHA-256 `eb33e51f49a15e023950cd7825ca74a4a2b43db8354825ac24fc1b7ee09e6fa3` |
| Signing key of the release | `4EF4AC63455FC9F4545D9B7DEF8FE99528B52FFD` (`signing@zstd.net`) |
| Toolchain | Debian trixie (`debian:trixie`), clang 19.1.7, lld, wasi-libc, binaryen's `wasm-opt` |
| `zstd-decoder.wasm` | 73,552 bytes, SHA-256 `6a1f218ab5c2251f9c3f7a8dd0e3368e4d70b23b3341fba98c22255a3fbb66b9` |

Measured in Chrome against the JavaScript packages, it decoded a 2.8 MB recording at about 1.65 GB/s, as fast as
or faster than all of them, and with the wrapper it is 29 KB gzipped.

## Building it

The build runs in a `debian:trixie` container, so nothing is installed on the host. Building the same version
with the same toolchain gives the same file; three builds in a row matched the SHA-256 above. Debian updates
trixie's packages over time, so a later build may use another clang and produce other bytes.

1. Download the release, its checksum and its signature into an empty directory:

   ```sh
   mkdir zstd-build && cd zstd-build
   for file in zstd-1.5.7.tar.gz zstd-1.5.7.tar.gz.sha256 zstd-1.5.7.tar.gz.sig; do
       curl -fsSLO "https://github.com/facebook/zstd/releases/download/v1.5.7/$file"
   done
   ```

2. Check the signature with zstd's signing key. The checksum in `build.sh` only shows that the file is complete;
   the signature shows that zstd published it:

   ```sh
   gpg --recv-keys 4EF4AC63455FC9F4545D9B7DEF8FE99528B52FFD
   gpg --verify zstd-1.5.7.tar.gz.sig zstd-1.5.7.tar.gz
   ```

3. Copy `build.sh` from this directory next to the tarball and run it in a container. It checks the tarball's
   SHA-256, combines zstd's decoder with zstd's `combine.py`, compiles it with clang to `wasm32-wasi`, optimizes it
   with `wasm-opt`, and prints the file's size, SHA-256, imports and exports:

   ```sh
   cp /path/to/puth/workspaces/zstd-decoder/build.sh .
   docker run --rm -v "$PWD":/w -w /w debian:trixie sh build.sh
   ```

4. Compare the printed SHA-256 with the table above. If it matches, the result is the committed file. Otherwise,
   copy `zstd-decoder.wasm` over the committed one only on purpose, run the tests, and update the table.

The container writes as root, so the files it creates in the directory belong to root.

### The flags

- `--target=wasm32-wasi --sysroot=/usr`: Debian installs wasi-libc for this target under `/usr`. The decoder
  only uses its `malloc`, `free` and memory functions, none of the WASI system calls, so the module has no imports.
- `-nostartfiles -Wl,--no-entry`: a library without a `main`.
- `-Wl,--export=…`: only the functions the wrapper calls stay, `--gc-sections` drops the rest.
- `-O3 -flto -mbulk-memory`: optimized for speed, with memory copies as single WebAssembly instructions.
- `-DNDEBUG`: without zstd's assertions.

## Licence

`zstd-decoder.wasm` is compiled from zstd, © Meta Platforms, Inc. and affiliates, under the BSD licence in
`LICENSE-zstd` (zstd is dual-licensed under BSD and GPLv2; this package uses the BSD licence). Everything else in
this directory is under Puth's licence in the repository's `LICENCE.md`.
