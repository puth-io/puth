/**
 * Compresses with zstd's own encoder, built to WebAssembly from the official release (see README.md). It
 * compresses whole buffers at once, with every compression level zstd has.
 */

type ZstdExports = {
    memory: WebAssembly.Memory;
    ZSTD_isError(code: number): number;
    ZSTD_compressBound(size: number): number;
    ZSTD_compress(target: number, targetSize: number, source: number, sourceSize: number, level: number): number;
    ZSTD_minCLevel(): number;
    ZSTD_maxCLevel(): number;
    malloc(size: number): number;
    free(pointer: number): void;
};

export type ZstdEncoderOptions = {
    /** The compression level, from zstd's negative levels up to 22. 3 by default, like zstd's. */
    level?: number;
};

export type ZstdEncode = (data: Uint8Array) => Uint8Array;

/**
 * Instantiates the encoder from the bytes or compiled module of zstd-encoder.wasm.
 */
export async function createZstdEncoder(wasm: BufferSource | WebAssembly.Module, options: ZstdEncoderOptions = {}): Promise<ZstdEncode> {
    const instance = wasm instanceof WebAssembly.Module
        ? await WebAssembly.instantiate(wasm, {})
        : (await WebAssembly.instantiate(wasm, {})).instance;
    const zstd = instance.exports as unknown as ZstdExports;

    const level = options.level ?? 3;
    if (! Number.isInteger(level) || level < zstd.ZSTD_minCLevel() || level > zstd.ZSTD_maxCLevel()) {
        throw new RangeError(`zstd compression levels go from ${zstd.ZSTD_minCLevel()} to ${zstd.ZSTD_maxCLevel()}, not ${level}`);
    }

    const allocate = (size: number) => {
        const pointer = zstd.malloc(size);
        if (pointer === 0) {
            throw new Error(`Could not allocate ${size} bytes for zstd`);
        }
        return pointer;
    };

    return (data: Uint8Array) => {
        // size_t results are unsigned, JavaScript gets them as signed 32-bit numbers.
        const bound = zstd.ZSTD_compressBound(data.length) >>> 0;
        if (bound === 0 || zstd.ZSTD_isError(bound)) {
            throw new Error(`${data.length} bytes are too many to compress at once`);
        }
        // Both buffers live in the module's memory; everything is freed after the call, which the allocator relies on.
        const source = allocate(Math.max(data.length, 1));
        try {
            const target = allocate(bound);
            try {
                new Uint8Array(zstd.memory.buffer).set(data, source);
                const size = zstd.ZSTD_compress(target, bound, source, data.length, level);
                // The build has no error texts; for an encoder, what fails is memory.
                if (zstd.ZSTD_isError(size)) {
                    throw new Error('zstd could not compress, the data probably needs more memory than WebAssembly has');
                }
                return new Uint8Array(zstd.memory.buffer).slice(target, target + (size >>> 0));
            } finally {
                zstd.free(target);
            }
        } finally {
            zstd.free(source);
        }
    };
}
