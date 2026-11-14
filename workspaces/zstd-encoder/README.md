# @puth/zstd-encoder

zstd's encoder, built to WebAssembly from the official zstd release, as small as it gets with every compression
level. It only compresses; `@puth/zstd-decoder` decodes. Puth's GUI compresses the recordings it exports with it.

```ts
import { createZstdEncoder } from '@puth/zstd-encoder';
import wasmUrl from '@puth/zstd-encoder/zstd-encoder.wasm?url';

const encode = await createZstdEncoder(await (await fetch(wasmUrl)).arrayBuffer(), { level: 3 });
const compressed = encode(bytes);
```

It compresses whole buffers at once, so the input and the result have to fit into WebAssembly's memory together
(4 GiB). Levels go from zstd's negative levels to 22, and any zstd decoder reads the result; at the same level it
is within 1 % of the size Node's zstd produces. `npm -w @puth/zstd-encoder run test` checks both with Node.

`zstd-encoder.wasm` imports nothing, so it can't reach anything outside its own memory. It exports:

```
ZSTD_isError ZSTD_getErrorName ZSTD_compressBound ZSTD_compress ZSTD_minCLevel ZSTD_maxCLevel malloc free memory
```

| | |
| --- | --- |
| zstd | 1.5.7, `zstd-1.5.7.tar.gz`, SHA-256 `eb33e51f49a15e023950cd7825ca74a4a2b43db8354825ac24fc1b7ee09e6fa3` |
| Signing key of the release | `4EF4AC63455FC9F4545D9B7DEF8FE99528B52FFD` (`signing@zstd.net`) |
| Toolchain | Debian trixie (`debian:trixie`), clang 19.1.7, lld, wasi-libc, binaryen's `wasm-opt` |
| `zstd-encoder.wasm` | 69,122 bytes, SHA-256 `da7f35d9e975ab7cfba44fc62ccf77d00a8830fe1a69e7eca63d71a163f233b8` |

It is 34 KB gzipped. At level 3, it compressed HTML at about 1 GB/s and a recording with JPEG frames at about
310 MB/s in Node, where Node's native zstd reached 1.2 GB/s and 580 MB/s.

## How small, and why

The same zstd built for speed is 98 KB gzipped. Each step below was measured on its own, gzipped:

| | |
| --- | --- |
| `-O3`, all of zstd | 97.6 KB |
| `-Oz` and `ZSTD_NO_INLINE`: zstd forces inlining of its hot functions, which bloats WebAssembly without making it faster | 43.2 KB |
| `ZSTD_STRIP_ERROR_STRINGS`: an encoder's errors come down to memory, the wrapper says so itself | |
| `alloc.c` instead of wasi-libc's dlmalloc, the only wasi-libc code in the module | 40.5 KB |
| Only one-shot compression, without zstd's streaming API | 33.9 KB |
| `wasm-opt --converge`, without the `producers` and `target_features` sections | 33.8 KB |

Leaving out compression levels (zstd's `ZSTD_LIB_EXCLUDE_COMPRESSORS_GREEDY_AND_UP`) would save about 4 KB more,
but changes what the higher levels do. Going further would mean changing zstd's sources.

### The allocator

`alloc.c` is a bump allocator: memory is handed out in order and starts over once nothing is allocated anymore.
The wrapper frees its buffers after each call and zstd frees its context, so every call reuses memory from the
start. Code that keeps an allocation alive would make it grow instead, which the wrapper never does. Memory a call
needed stays with the module, as it would with any allocator in WebAssembly: about 3 MB at level 3, 19 MB at 22.

### zstd's sources

zstd's single-file library, `build/single_file_libs/zstd-in.c`, turns threads on for every compiler but
Emscripten and always includes the dictionary builder, which needs a clock. `build.sh` removes those two parts
with `sed` before zstd's own `combine.py` combines the library into one file; nothing else of zstd changes.

## Building it

The build runs in a `debian:trixie` container, so nothing is installed on the host. Building the same version
with the same toolchain gives the same file; two builds in a row matched the SHA-256 above. Debian updates
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

3. Copy `build.sh` and `alloc.c` from this directory next to the tarball and run the script in a container. It
   checks the tarball's SHA-256, prepares and combines zstd's library, compiles it with `alloc.c` with clang to
   `wasm32-wasi`, optimizes it with `wasm-opt`, and prints the file's size, SHA-256, imports and exports:

   ```sh
   cp /path/to/puth/workspaces/zstd-encoder/build.sh /path/to/puth/workspaces/zstd-encoder/alloc.c .
   docker run --rm -v "$PWD":/w -w /w debian:trixie sh build.sh
   ```

4. Compare the printed SHA-256 with the table above. If it matches, the result is the committed file. Otherwise,
   copy `zstd-encoder.wasm` over the committed one only on purpose, run the tests, and update the table.

The container writes as root, so the files it creates in the directory belong to root.

### The flags

- `--target=wasm32-wasi --sysroot=/usr`: Debian installs wasi-libc for this target under `/usr`. With the
  allocator from `alloc.c`, the encoder uses none of its code beyond what clang turns into single WebAssembly
  instructions, and none of the WASI system calls, so the module has no imports.
- `-nostartfiles -Wl,--no-entry`: a library without a `main`.
- `-Wl,--export=…`: only the functions the wrapper calls stay, `--gc-sections` drops the rest, the decoder too.
- `-Oz -flto -mbulk-memory`: optimized for size, with memory copies as single WebAssembly instructions.
- `-DZSTD_NO_INLINE -DZSTD_STRIP_ERROR_STRINGS`: from zstd's own size options (`ZSTD_LIB_MINIFY`).
- `-DNDEBUG`: without zstd's assertions.

## Licence

`zstd-encoder.wasm` is compiled from zstd, © Meta Platforms, Inc. and affiliates, under the BSD licence in
`LICENSE-zstd` (zstd is dual-licensed under BSD and GPLv2; this package uses the BSD licence). Everything else in
this directory is under Puth's licence in the repository's `LICENCE.md`.
