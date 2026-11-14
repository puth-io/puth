/**
 * Decodes zstd with zstd's own decoder, built to WebAssembly from the official release (see README.md).
 *
 * Every result is checked: input that isn't a valid zstd stream throws, sizes a frame claims are bounded by
 * maxSize, and frames without a content size are decoded as a stream.
 */

type ZstdExports = {
    memory: WebAssembly.Memory;
    ZSTD_isError(code: number): number;
    ZSTD_getErrorName(code: number): number;
    ZSTD_getFrameContentSize(source: number, sourceSize: number): bigint;
    ZSTD_decompress(target: number, targetSize: number, source: number, sourceSize: number): number;
    ZSTD_createDStream(): number;
    ZSTD_freeDStream(stream: number): number;
    ZSTD_initDStream(stream: number): number;
    ZSTD_decompressStream(stream: number, output: number, input: number): number;
    ZSTD_DStreamOutSize(): number;
    malloc(size: number): number;
    free(pointer: number): void;
};

export type ZstdDecoderOptions = {
    /** The most bytes a decoded stream may have. 1 GiB by default. */
    maxSize?: number;
};

export type ZstdDecode = (data: Uint8Array) => Uint8Array;

const CONTENT_SIZE_UNKNOWN = 2n ** 64n - 1n;
const CONTENT_SIZE_ERROR = 2n ** 64n - 2n;

/**
 * Instantiates the decoder from the bytes or compiled module of zstd-decoder.wasm.
 */
export async function createZstdDecoder(wasm: BufferSource | WebAssembly.Module, options: ZstdDecoderOptions = {}): Promise<ZstdDecode> {
    const maxSize = options.maxSize ?? 1024 ** 3;
    const instance = wasm instanceof WebAssembly.Module
        ? await WebAssembly.instantiate(wasm, {})
        : (await WebAssembly.instantiate(wasm, {})).instance;
    const zstd = instance.exports as unknown as ZstdExports;
    // Memory grows while decoding, so views are made when they are needed.
    const memory = () => new Uint8Array(zstd.memory.buffer);
    const view = () => new DataView(zstd.memory.buffer);

    const errorName = (code: number) => {
        const pointer = zstd.ZSTD_getErrorName(code);
        const bytes = memory();
        let end = pointer;
        while (bytes[end] !== 0) {
            end++;
        }
        return new TextDecoder().decode(bytes.subarray(pointer, end));
    };

    // size_t results are unsigned, JavaScript gets them as signed 32-bit numbers.
    const checked = (code: number) => {
        if (zstd.ZSTD_isError(code)) {
            throw new Error(`Not a valid zstd stream: ${errorName(code)}`);
        }
        return code >>> 0;
    };

    const allocate = (size: number) => {
        const pointer = zstd.malloc(size);
        if (pointer === 0) {
            throw new Error(`Could not allocate ${size} bytes for zstd`);
        }
        return pointer;
    };

    // The size the frame header gives has to be what the frame decodes to.
    const decodeKnown = (source: number, sourceSize: number, size: number) => {
        const target = allocate(Math.max(size, 1));
        try {
            const written = checked(zstd.ZSTD_decompress(target, size, source, sourceSize));
            if (written !== size) {
                throw new Error(`zstd frame claims ${size} bytes but has ${written}`);
            }
            return memory().slice(target, target + size);
        } finally {
            zstd.free(target);
        }
    };

    const decodeStream = (source: number, sourceSize: number) => {
        const stream = zstd.ZSTD_createDStream();
        if (stream === 0) {
            throw new Error('Could not create a zstd stream');
        }
        const chunkSize = zstd.ZSTD_DStreamOutSize();
        const chunk = allocate(chunkSize);
        // ZSTD_inBuffer and ZSTD_outBuffer: pointer, size and position, each 32-bit.
        const buffers = allocate(24);
        const input = buffers;
        const output = buffers + 12;
        try {
            checked(zstd.ZSTD_initDStream(stream));
            view().setUint32(input, source, true);
            view().setUint32(input + 4, sourceSize, true);
            view().setUint32(input + 8, 0, true);

            const chunks: Uint8Array[] = [];
            let total = 0;
            while (true) {
                view().setUint32(output, chunk, true);
                view().setUint32(output + 4, chunkSize, true);
                view().setUint32(output + 8, 0, true);
                const remaining = checked(zstd.ZSTD_decompressStream(stream, output, input));
                const produced = view().getUint32(output + 8, true);
                total += produced;
                if (total > maxSize) {
                    throw new Error(`zstd stream is larger than ${maxSize} bytes`);
                }
                if (produced > 0) {
                    chunks.push(memory().slice(chunk, chunk + produced));
                }
                const consumed = view().getUint32(input + 8, true);
                if (remaining === 0 && consumed === sourceSize) {
                    break;
                }
                if (consumed === sourceSize && produced === 0) {
                    throw new Error('zstd stream ends early');
                }
            }

            const result = new Uint8Array(total);
            let at = 0;
            for (const part of chunks) {
                result.set(part, at);
                at += part.length;
            }
            return result;
        } finally {
            zstd.free(buffers);
            zstd.free(chunk);
            zstd.ZSTD_freeDStream(stream);
        }
    };

    return (data: Uint8Array) => {
        const source = allocate(Math.max(data.length, 1));
        try {
            memory().set(data, source);
            // 64-bit results arrive as signed BigInts; zstd's markers are the largest unsigned values.
            const size = BigInt.asUintN(64, zstd.ZSTD_getFrameContentSize(source, data.length));
            if (size === CONTENT_SIZE_ERROR) {
                throw new Error('Not a zstd frame');
            }
            // Without a size, or with more than allowed, the stream decides and stops at maxSize.
            if (size === CONTENT_SIZE_UNKNOWN || size > BigInt(maxSize)) {
                return decodeStream(source, data.length);
            }
            return decodeKnown(source, data.length, Number(size));
        } finally {
            zstd.free(source);
        }
    };
}
