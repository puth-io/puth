#!/bin/sh
# Builds zstd's encoder to WebAssembly from the official zstd release, as small as it gets with all compression
# levels: with clang, lld and wasi-libc from Debian, and the allocator in alloc.c instead of wasi-libc's. Runs
# inside a debian:trixie container next to the release tarball and alloc.c, see README.md; it installs packages
# and is not meant for a development machine.
#
# This exact script, with Debian trixie's clang 19.1.7, produced the committed zstd-encoder.wasm.
set -eu
VERSION=1.5.7
SHA256=eb33e51f49a15e023950cd7825ca74a4a2b43db8354825ac24fc1b7ee09e6fa3

apt-get update -qq >/dev/null
apt-get install -y -qq --no-install-recommends clang lld wasi-libc libclang-rt-dev-wasm32 python3 binaryen wabt >/dev/null
echo "$SHA256  zstd-$VERSION.tar.gz" | sha256sum -c -

rm -rf build && mkdir build && tar -xzf zstd-$VERSION.tar.gz -C build
cd build/zstd-$VERSION/build/single_file_libs
# zstd's single-file library, without threads, which WebAssembly has none of here, and without the dictionary
# builder, which needs a clock. Then zstd's own script combines it into one file.
sed -e '/#define ZSTD_MULTITHREAD/d' -e '/dictBuilder\//d' zstd-in.c > zstd-wasm-in.c
python3 combine.py -r ../../lib -x legacy/zstd_legacy.h -o zstd.c zstd-wasm-in.c

# Only one-shot compression: the streaming API would add a quarter to the size.
EXPORTS="ZSTD_isError ZSTD_getErrorName ZSTD_compressBound ZSTD_compress ZSTD_minCLevel ZSTD_maxCLevel malloc free"
clang --target=wasm32-wasi --sysroot=/usr -Oz -flto -DNDEBUG -mbulk-memory -DZSTD_NO_INLINE -DZSTD_STRIP_ERROR_STRINGS \
    -nostartfiles -Wl,--no-entry -Wl,--strip-all -Wl,--gc-sections \
    $(for name in $EXPORTS; do printf -- '-Wl,--export=%s ' $name; done) \
    -o /w/zstd-encoder.wasm zstd.c /w/alloc.c
wasm-opt -Oz --converge --strip-producers --strip-target-features --enable-bulk-memory /w/zstd-encoder.wasm -o /w/zstd-encoder.wasm

cd /w
clang --version | head -1
ls -l zstd-encoder.wasm
sha256sum zstd-encoder.wasm
echo "imports:"; wasm-objdump -x -j Import zstd-encoder.wasm | grep -E '^ - ' || echo "  (none)"
echo "exports:"; wasm-objdump -x -j Export zstd-encoder.wasm | grep -E '^ - ' | sed 's/^ - /  /'
