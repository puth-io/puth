import {createZstdDecoder, type ZstdDecode} from '@puth/zstd-decoder';
import wasmUrl from '@puth/zstd-decoder/zstd-decoder.wasm?url';

// Puth's instance keeps up to 1 GiB of recordings, all of which a connection can receive at once.
const MAX_SIZE = 1536 * 1024 * 1024;

let decoder: Promise<ZstdDecode>|undefined;

const zstd = () => decoder ??= fetch(wasmUrl)
    .then(response => response.arrayBuffer())
    .then(wasm => createZstdDecoder(wasm, {maxSize: MAX_SIZE}));

/** Whether data starts like a zstd frame; msgpack data of packets starts with an array or a map instead. */
export const isZstd = (data: Uint8Array) =>
    data.length >= 4 && data[0] === 0x28 && data[1] === 0xb5 && data[2] === 0x2f && data[3] === 0xfd;

/** Recordings are msgpack compressed with zstd; files of earlier GUIs may be plain msgpack. */
export async function decompressRecording(data: Uint8Array): Promise<Uint8Array> {
    return isZstd(data) ? (await zstd())(data) : data;
}

let encoder: Promise<(data: Uint8Array) => Uint8Array>|undefined;

// Loaded the first time something is exported, so the GUI doesn't carry the encoder until then.
const zstdEncoder = () => encoder ??= Promise.all([
    import('@puth/zstd-encoder'),
    import('@puth/zstd-encoder/zstd-encoder.wasm?url'),
]).then(async ([{createZstdEncoder}, {default: url}]) => createZstdEncoder(await (await fetch(url)).arrayBuffer()));

/** Compresses a recording like Puth saves .puth files: msgpack compressed with zstd. */
export async function compressRecording(data: Uint8Array): Promise<Uint8Array> {
    return (await zstdEncoder())(data);
}
