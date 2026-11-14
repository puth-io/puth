import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import zlib from 'node:zlib';
import { createZstdDecoder } from '../src/zstd.ts';

const wasm = readFileSync(new URL('../zstd-decoder.wasm', import.meta.url));
const text = Buffer.from(Array.from({ length: 20000 }, (_, i) => `<li class="item">Item ${i}</li>`).join('\n'));
const compressed = zlib.zstdCompressSync(text);

// Streaming compressors write frames without a content size.
const streamed = (data: Buffer) => new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    const stream = zlib.createZstdCompress();
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    for (let i = 0; i < data.length; i += 65536) {
        stream.write(data.subarray(i, i + 65536));
    }
    stream.end();
});

describe('zstd decoder', () => {
    it('imports nothing', () => {
        assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(wasm)), []);
    });

    it('decodes what Node compresses', async () => {
        const decode = await createZstdDecoder(wasm);
        assert.deepEqual(Buffer.from(decode(compressed)), text);
        assert.deepEqual(Buffer.from(decode(zlib.zstdCompressSync(Buffer.alloc(0)))), Buffer.alloc(0));
    });

    it('decodes frames without a content size', async () => {
        const decode = await createZstdDecoder(wasm);
        assert.deepEqual(Buffer.from(decode(await streamed(text))), text);
    });

    it('throws for input that is not a valid zstd stream', async () => {
        const decode = await createZstdDecoder(wasm);
        const flipped = Buffer.from(compressed);
        for (let i = 32; i < flipped.length; i += 101) {
            flipped[i] ^= 0xff;
        }

        assert.throws(() => decode(compressed.subarray(0, compressed.length >> 1)));
        assert.throws(() => decode(flipped));
        assert.throws(() => decode(Buffer.from('not zstd at all')), /Not a zstd frame/);
        assert.throws(() => decode(new Uint8Array(0)));
    });

    it('stops at maxSize, whatever a frame claims', async () => {
        const decode = await createZstdDecoder(wasm, { maxSize: 1000 });
        assert.throws(() => decode(compressed), /larger than 1000 bytes/);
        const withoutSize = await streamed(text);
        assert.throws(() => decode(withoutSize), /larger than 1000 bytes/);

        // A header that claims 4 GB.
        const claim = Buffer.from(compressed);
        const descriptor = claim[4];
        assert.equal(descriptor >> 6, 2, 'the frame has a 4-byte content size');
        claim.writeUInt32LE(0xfffffff0, 5 + (((descriptor >> 5) & 1) ? 0 : 1) + [0, 1, 2, 4][descriptor & 3]);
        assert.throws(() => decode(claim));
    });

    it('decodes again after an error', async () => {
        const decode = await createZstdDecoder(wasm);
        assert.throws(() => decode(Buffer.from('broken')));
        assert.deepEqual(Buffer.from(decode(compressed)), text);
    });
});
