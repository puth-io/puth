import {createZstdDecoder, type ZstdDecode} from '@puth/zstd';
import wasmUrl from '@puth/zstd/zstd-decoder.wasm?url';

// Puth's instance keeps up to 1 GiB of recordings, all of which a connection can receive at once.
const MAX_SIZE = 1536 * 1024 * 1024;

let decoder: Promise<ZstdDecode>|undefined;

const zstd = () => decoder ??= fetch(wasmUrl)
    .then(response => response.arrayBuffer())
    .then(wasm => createZstdDecoder(wasm, {maxSize: MAX_SIZE}));

/** Whether data starts like a zstd frame; msgpack data of packets starts with an array or a map instead. */
export const isZstd = (data: Uint8Array) =>
    data.length >= 4 && data[0] === 0x28 && data[1] === 0xb5 && data[2] === 0x2f && data[3] === 0xfd;

/** Recordings from Puth are msgpack compressed with zstd; files the GUI exported are plain msgpack. */
export async function decompressRecording(data: Uint8Array): Promise<Uint8Array> {
    return isZstd(data) ? (await zstd())(data) : data;
}
