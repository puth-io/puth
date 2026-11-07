import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decode, encode } from '@msgpack/msgpack';
import { type Browser, Context, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';
import { fixtureUrl, makePuthServer } from '../helper';
import { LiveViewSnapshotPlugin } from '../../src/plugins/LiveViewPlugin';
import { PUTH_EXTENSION_CODEC } from '../../src/handlers/WebsocketHandler';

// Puth tests its own GUI: an instance records and serves the GUI, which the generated client drives over HTTP.

const cleanups: (() => unknown)[] = [];
let directory: string;

beforeEach(() => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'puth-gui-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
});

// In reverse order, contexts have to go before the instance they live on.
afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

async function startInstance(options = {}) {
    const instance = makePuthServer(0, '127.0.0.1', options);
    instance.use(LiveViewSnapshotPlugin);
    cleanups.push(() => instance.destroy());
    await instance.http.ready();

    return instance;
}

const clientOf = (instance) => new RemotePuthClient(instance.http.url.replace(/\/$/, ''));

async function createContext(instance, options = {}) {
    const context = await Context.create(clientOf(instance), options);
    cleanups.push(() => context.destroy({ immediately: true }));

    return context;
}

async function openGui(instance): Promise<Browser> {
    const context = await createContext(instance);
    const gui = await context.createBrowserShim();

    await gui.visit(instance.http.url);

    return gui;
}

async function importFile(gui: Browser, name: string, content: Uint8Array) {
    const file = path.join(directory, name);
    writeFileSync(file, content);

    const input = await gui.firstOrFail('input[type=file]');
    await input.uploadFile(file);
}

const paint = (browser, color: number) => browser.evaluate(`(() => {
    const overlay = document.getElementById('paint')
        ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'paint' }));
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgb(${color}, 40, 90)';
})()`);

async function recordFailedRun(instance) {
    const context = await createContext(instance, { snapshot: true, test: { name: 'failed checkout' } });
    const browser = await context.createBrowserShim();

    await browser.setTimeout(200);
    await browser.visit(fixtureUrl());
    await browser.evaluate(`console.log('recorded console message')`);
    for (let color = 0; color < 5; color++) {
        await paint(browser, color * 40);
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await browser.click('#does-not-exist').catch(() => {});
    await context.testFailed();
    await context.destroy({ immediately: true });
}

async function connect(gui: Browser, instance) {
    const { host } = new URL(instance.http.url);

    await gui.press(`ws://${host}/websocket`);
}

// The download goes through an object URL, so the exported bytes can be read from the page.
async function exportActiveContext(gui: Browser): Promise<Uint8Array> {
    await gui.evaluate(`(() => {
        const createObjectURL = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
            window.exportedSnapshot = blob;
            return createObjectURL.call(URL, blob);
        };
    })()`);

    await gui.click('[puth="export-snapshot"]');
    await gui.waitUntil('window.exportedSnapshot !== undefined');

    return Buffer.from(await gui.evaluate(`window.exportedSnapshot.arrayBuffer().then((buffer) => {
        let binary = '';
        new Uint8Array(buffer).forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    })`), 'base64');
}

const contextPacket = (extra = {}) => ({
    id: 'context-1',
    type: 'context',
    context: { id: 'context-1', type: 'Context', test: { name: 'crafted run', status: 'pending' }, group: '' },
    test: { name: 'crafted run', status: 'pending' },
    group: '',
    options: {},
    createdAt: 1,
    timestamp: 1,
    ...extra,
});

describe('Snapshot replay', () => {
    it('loads nothing from other hosts', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        const requested: string[] = JSON.parse(await gui.evaluate(
            `JSON.stringify(performance.getEntriesByType('resource').map((entry) => entry.name))`,
        ));

        const { host } = new URL(instance.http.url);
        assert.isNotEmpty(requested);
        assert.deepEqual(requested.filter((url) => new URL(url).host !== host), []);
    }, 30000);

    it('shows a failed run after exporting and importing it', async () => {
        const instance = await startInstance();
        await recordFailedRun(instance);

        const live = await openGui(instance);
        await connect(live, instance);
        await live.waitForText('failed checkout');
        await live.click('.bg-context-step');
        await live.waitFor('tr.command');
        const snapshot = await exportActiveContext(live);

        const gui = await openGui(instance);
        await importFile(gui, 'failed.puth', snapshot);

        await gui.waitForText('failed checkout');
        await gui.assertSee('recorded console message');
        await gui.assertSee('#does-not-exist');
        await gui.assertVisible('[data-messagetype="error"]');
        await gui.assertSeeIn('[data-messagetype="error"]', 'Waited 200ms for selector');

        await gui.click('tr.command:has(+ tr [data-messagetype="error"])');
        await gui.assertVisible('tr.command.active:has(+ tr [data-messagetype="error"])');
        await gui.assertVisible('img[src^="blob:"], img[src^="data:"]');
    }, 40000);

    it('keeps repeated response content when importing and exporting', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);
        const body = Uint8Array.from([1, 2, 3]);

        await importFile(gui, 'responses.puth', encode([
            contextPacket(),
            { id: 'first', type: 'response', content: body, contentHash: 'hash', timestamp: 2 },
            { id: 'second', type: 'response', contentReference: 'first', contentHash: 'hash', timestamp: 3 },
        ]));
        await gui.waitForText('crafted run');

        const exported = decode(await exportActiveContext(gui), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        const packet = (id: string) => exported.find((item) => item.id === id);

        assert.deepEqual(Array.from(packet('first').content), Array.from(body));
        assert.strictEqual(packet('second').contentReference, 'first');
        assert.isUndefined(packet('second').content);
    }, 30000);

    it('imports snapshots from before versions existed', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        await importFile(gui, 'legacy.puth', encode([contextPacket()]));

        await gui.waitForText('crafted run');
    }, 30000);

    it('shows where a truncated recording ends', async () => {
        const instance = await startInstance({ recording: { context: 32 * 1024 } });
        const directoryOption = path.relative(process.cwd(), directory);
        const context = await createContext(instance, { snapshot: true, test: { name: 'long run' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        for (let i = 0; i < 30; i++) {
            await browser.evaluate(`console.log('x'.repeat(2048))`);
        }
        await context.destroy({ immediately: true, save: { to: 'file', location: directoryOption } });

        const live = await openGui(instance);
        await connect(live, instance);
        await live.waitForText('long run');
        await live.click('.bg-context-step');
        await live.waitForText('Later packets are missing');
        const snapshot = await exportActiveContext(live);

        const gui = await openGui(instance);
        await importFile(gui, 'truncated.puth', snapshot);

        await gui.waitForText('long run');
        await gui.assertSee('Later packets are missing from this recording.');
    }, 40000);
});

describe('Snapshot import errors', () => {
    it.each([
        ['bytes that are not msgpack', Uint8Array.from([0xc1, 0xc1, 0xc1]), 'not a Puth snapshot'],
        ['something other than a list', encode({ type: 'context' }), 'does not contain any packets'],
        ['an empty list', encode([]), 'does not contain any packets'],
        ['no leading context packet', encode([{ type: 'log' }]), 'does not start with a context packet'],
        ['a newer version', encode([contextPacket({ snapshotVersion: 99 })]), 'Snapshot version 99 is not supported'],
        ['a broken version', encode([contextPacket({ snapshotVersion: 'one' })]), 'Snapshot version one is not supported'],
        [
            'a reference to missing content',
            encode([contextPacket(), { id: 'second', type: 'response', contentReference: 'gone', timestamp: 2 }]),
            'references content that is missing',
        ],
        ['packets the GUI cannot read', encode([contextPacket(), { id: 'broken', type: 'command' }]), 'could not be read'],
    ])('explains %s', async (_, content, message) => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        await importFile(gui, 'invalid.puth', content);

        await gui.waitFor('[puth="import-errors"]');
        await gui.assertSeeIn('[puth="import-errors"]', 'invalid.puth');
        await gui.assertSeeIn('[puth="import-errors"]', message);
        await gui.assertDontSee('Importing snapshot');
    }, 30000);

    it('recovers and clears the error with the next valid file', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        await importFile(gui, 'invalid.puth', Uint8Array.from([0xc1]));
        await gui.waitFor('[puth="import-errors"]');
        await importFile(gui, 'valid.puth', encode([contextPacket()]));

        await gui.waitForText('crafted run');
        await gui.assertMissing('[puth="import-errors"]');
    }, 30000);

    it('refuses the same snapshot twice', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        await importFile(gui, 'first.puth', encode([contextPacket()]));
        await gui.waitForText('crafted run');
        await importFile(gui, 'second.puth', encode([contextPacket()]));

        await gui.waitFor('[puth="import-errors"]');
        await gui.assertSeeIn('[puth="import-errors"]', 'already imported');
    }, 30000);
});
