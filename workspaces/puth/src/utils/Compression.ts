import {promisify} from 'node:util';
import zlib from 'node:zlib';

// Fast, and close to the ratio of much slower levels for recordings.
const LEVEL = 3;
const OPTIONS = {params: {[zlib.constants.ZSTD_c_compressionLevel]: LEVEL}};

const compressAsync = promisify(zlib.zstdCompress);

/**
 * Recordings are msgpack compressed with zstd, as files (.puth), from the snapshot interface and over the
 * websocket. Compressing in the background keeps the server responsive while tests run.
 */
export const compress = (data: Uint8Array): Promise<Uint8Array> => compressAsync(data, OPTIONS);

export const compressSync = (data: Uint8Array): Uint8Array => zlib.zstdCompressSync(data, OPTIONS);

/** Whether data starts like a zstd frame; msgpack data of packets starts with an array or a map instead. */
export const isZstd = (data: Uint8Array): boolean =>
    data.length >= 4 && data[0] === 0x28 && data[1] === 0xb5 && data[2] === 0x2f && data[3] === 0xfd;
