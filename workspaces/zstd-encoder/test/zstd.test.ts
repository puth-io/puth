import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import zlib from 'node:zlib';
import { createZstdEncoder } from '../src/zstd.ts';

const wasm = readFileSync(new URL('../zstd-encoder.wasm', import.meta.url));
const text = Buffer.from(Array.from({ length: 20000 }, (_, i) => `<li class="item">Item ${i}</li>`).join('\n'));

describe('zstd encoder', () => {
    it('imports nothing', () => {
        assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(wasm)), []);
    });

    it('compresses what Node decompresses, at every kind of level', async () => {
        for (const level of [-5, 1, 3, 12, 22]) {
            const encode = await createZstdEncoder(wasm, { level });
            const compressed = encode(text);
            assert.ok(compressed.length < text.length / 5, `level ${level} compresses`);
            assert.deepEqual(zlib.zstdDecompressSync(compressed), text, `level ${level}`);
        }
    });

    it('compresses about as well as Node at the same level', async () => {
        const encode = await createZstdEncoder(wasm);
        const node = zlib.zstdCompressSync(text, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 3 } }).length;
        assert.ok(Math.abs(encode(text).length - node) <= node / 100);
    });

    it('compresses empty and random data', async () => {
        const encode = await createZstdEncoder(wasm);
        assert.deepEqual(zlib.zstdDecompressSync(encode(new Uint8Array(0))), Buffer.alloc(0));
        const random = Buffer.from(Array.from({ length: 100000 }, (_, i) => (i * 2654435761) >>> 24));
        assert.deepEqual(zlib.zstdDecompressSync(encode(random)), random);
    });

    it('reuses its memory: the allocator starts over once everything is freed', () => {
        // What the wrapper does, on an instance this test can look into.
        const { malloc, free, memory, ZSTD_compressBound, ZSTD_compress } = new WebAssembly.Instance(new WebAssembly.Module(wasm), {}).exports as any;
        const compress = () => {
            const bound = ZSTD_compressBound(text.length);
            const source = malloc(text.length);
            const target = malloc(bound);
            new Uint8Array(memory.buffer).set(text, source);
            ZSTD_compress(target, bound, source, text.length, 3);
            free(target);
            free(source);
            return source;
        };

        const first = compress();
        const size = memory.buffer.byteLength;
        for (let i = 0; i < 20; i++) {
            assert.equal(compress(), first, 'the same address every time');
        }
        assert.equal(memory.buffer.byteLength, size);
    });

    it('rejects levels zstd does not have', async () => {
        await assert.rejects(createZstdEncoder(wasm, { level: 23 }), RangeError);
        await assert.rejects(createZstdEncoder(wasm, { level: 1.5 }), RangeError);
    });
});
