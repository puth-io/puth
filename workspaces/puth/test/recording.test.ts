import { readdirSync, rmSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decode } from '@msgpack/msgpack';
import { afterEach, assert, describe, it } from 'vitest';
import { PuthStandardPlugin } from '../';
import { Puth } from '../src/Puth';
import { PUTH_EXTENSION_CODEC } from '../src/handlers/WebsocketHandler';
import { fixtureUrl, installedBrowser, makeLocalPuthClient } from './helper';

const cleanups: (() => unknown)[] = [];

afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('Recording budgets', () => {
    it('keeps the browser working past the budget and saves an importable recording', async () => {
        const client = makeLocalPuthClient({ recording: { context: 16 * 1024 } });
        cleanups.push(() => client.destroy());
        client.use(PuthStandardPlugin);

        const puth = client.getPuth();
        let context!: any;
        puth.on('context:created', (event) => { context = event.context; });

        const remote = await client.contextCreate({ snapshot: true });
        const browser = await remote.createBrowser();
        const page = (await browser.pages())[0];
        await page.goto(fixtureUrl());

        for (let i = 0; i < 20; i++) {
            await page.evaluate(`console.log('x'.repeat(2048))`);
        }
        assert.strictEqual(await page.evaluate('1 + 1'), 2);

        const stats = puth.snapshotHandler.statsOf(context);
        assert.isTrue(stats.truncated);
        assert.isAtMost(stats.bytes, 16 * 1024);

        const directory = mkdtempSync(path.join(os.tmpdir(), 'puth-recording-'));
        cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
        await remote.destroy({ immediately: true, save: { to: 'file', location: path.relative(process.cwd(), directory) } });

        const [file] = readdirSync(directory);
        const packets = decode(readFileSync(path.join(directory, file)), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        assert.strictEqual(packets[0].type, 'context');
        assert.lengthOf(packets.filter((packet) => packet.truncation !== undefined), 1);
        assert.strictEqual(packets.at(-1).type, 'test');
    }, 20000);
});

describe('Diagnostics', () => {
    it('reports contexts, recording sizes and browsers over HTTP', async () => {
        const puth = new Puth({
            installedBrowser,
            staticDir: false,
            cors: { enabled: false },
            recording: { context: 1000000 },
            logger: { info() {}, debug() {}, warn() {}, error() {} },
        });
        cleanups.push(() => puth.destroy());
        const server = puth.serve(0, '127.0.0.1');
        await server.ready();

        const { id } = await puth.contextCreate({ snapshot: true });
        const diagnostics = await (await fetch(new URL('diagnostics', server.url!))).json();

        assert.lengthOf(diagnostics.contexts, 1);
        assert.strictEqual(diagnostics.contexts[0].id, id);
        assert.isAbove(diagnostics.contexts[0].recording.bytes, 0);
        assert.isFalse(diagnostics.contexts[0].recording.truncated);
        assert.strictEqual(diagnostics.recording.budgets.context, 1000000);
        assert.strictEqual(diagnostics.recording.budgets.instance, 1024 * 1024 * 1024);
        assert.deepEqual(diagnostics.browsers, { pooled: 0, unused: 0, contexts: 0 });
    });
});
