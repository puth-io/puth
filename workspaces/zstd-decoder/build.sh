#!/bin/sh
# Builds zstd's decoder to WebAssembly from the official zstd release, with clang, lld and wasi-libc from
# Debian, and the allocator in alloc.c instead of wasi-libc's. Runs inside a debian:trixie container next to the
# release tarball and alloc.c, see README.md; it installs packages and is not meant for a development machine.
#
# This exact script, with Debian trixie's clang 19.1.7, produced the committed zstd-decoder.wasm.
set -eu
VERSION=1.5.7
SHA256=eb33e51f49a15e023950cd7825ca74a4a2b43db8354825ac24fc1b7ee09e6fa3

apt-get update -qq >/dev/null
apt-get install -y -qq --no-install-recommends clang lld wasi-libc libclang-rt-dev-wasm32 python3 binaryen wabt >/dev/null
echo "$SHA256  zstd-$VERSION.tar.gz" | sha256sum -c -

rm -rf build && mkdir build && tar -xzf zstd-$VERSION.tar.gz -C build
cd build/zstd-$VERSION/build/single_file_libs
# zstd's own script that combines the decoder into one file, without legacy formats.
python3 combine.py -r ../../lib -x legacy/zstd_legacy.h -o zstddeclib.c zstddeclib-in.c

EXPORTS="ZSTD_isError ZSTD_getErrorName ZSTD_getFrameContentSize ZSTD_decompress \
    ZSTD_createDStream ZSTD_freeDStream ZSTD_initDStream ZSTD_decompressStream ZSTD_DStreamInSize ZSTD_DStreamOutSize malloc free"
clang --target=wasm32-wasi --sysroot=/usr -O3 -flto -DNDEBUG -mbulk-memory \
    -nostartfiles -Wl,--no-entry -Wl,--strip-all -Wl,--gc-sections \
    $(for name in $EXPORTS; do printf -- '-Wl,--export=%s ' $name; done) \
    -o /w/zstd-decoder.wasm zstddeclib.c /w/alloc.c
wasm-opt -O3 --enable-bulk-memory /w/zstd-decoder.wasm -o /w/zstd-decoder.wasm

cd /w
clang --version | head -1
ls -l zstd-decoder.wasm
sha256sum zstd-decoder.wasm
echo "imports:"; wasm-objdump -x -j Import zstd-decoder.wasm | grep -E '^ - ' || echo "  (none)"
echo "exports:"; wasm-objdump -x -j Export zstd-decoder.wasm | grep -E '^ - ' | sed 's/^ - /  /'
