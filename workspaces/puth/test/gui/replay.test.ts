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
        await live.click('[puth="history-item"]');
        await live.waitFor('[puth="step"]');
        const snapshot = await exportActiveContext(live);

        const gui = await openGui(instance);
        await importFile(gui, 'failed.puth', snapshot);

        await gui.waitForText('failed checkout');
        await gui.click('[puth="tab-console"]');
        await gui.assertSee('recorded console message');
        await gui.click('[puth="tab-steps"]');
        await gui.assertSee('#does-not-exist');
        await gui.assertVisible('[data-messagetype="error"]');
        await gui.assertSeeIn('[data-messagetype="error"]', 'Waited 200ms for selector');

        await gui.click('[puth="step"][data-failed]');
        await gui.assertVisible('[puth="step"][data-failed][data-active]');
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
        await live.click('[puth="history-item"]');
        await live.click('[puth="tab-console"]');
        await live.waitForText('Later packets are missing');
        const snapshot = await exportActiveContext(live);

        const gui = await openGui(instance);
        await importFile(gui, 'truncated.puth', snapshot);

        await gui.waitForText('long run');
        await gui.click('[puth="tab-console"]');
        await gui.assertSee('Later packets are missing from this recording.');
    }, 40000);
});

describe('Agent sessions', () => {
    const command = (id: string, func: string, args: unknown[], timestamp: number) => ({
        id,
        type: 'command',
        context: { id: 'context-1' },
        on: { type: 'Browser', path: [] },
        func,
        args,
        errors: [],
        snapshots: {},
        time: { started: timestamp, finished: timestamp + 5, took: 5, elapsed: timestamp },
        timestamp,
    });
    const annotation = (id: string, timestamp: number, extra: object) => ({ id, type: 'annotation', context: { id: 'context-1' }, timestamp, ...extra });

    it('groups steps by tool call and hides what the server did for itself', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);

        await importFile(gui, 'agent.puth', encode([
            contextPacket({ group: 'mcp', test: { name: 'agent run', status: 'pending' } }),
            annotation('a1', 2, { kind: 'tool', tool: 'puth_run', summary: 'visit, see' }),
            command('c1', 'setTimeout', [3000], 3),
            command('c2', 'visit', ['http://app.test/login'], 4),
            annotation('a2', 5, { kind: 'quiet', quiet: true }),
            command('c3', 'evaluate', ['outline()'], 6),
            annotation('a3', 7, { kind: 'quiet', quiet: false }),
            annotation('a4', 8, { kind: 'draft', format: 'laravel', name: 'Opens the login', code: "$browser->visit('/login');" }),
        ]));

        await gui.waitForText('agent run');
        await gui.assertSeeIn('[puth="tool-call"]', 'puth_run');
        await gui.assertSeeIn('[puth="draft"]', 'Opens the login');
        assert.strictEqual(await gui.evaluate(`document.querySelectorAll('[puth="step"]').length`), 1);
        await gui.assertSeeIn('[puth="step"]', 'visit');
    }, 30000);

    it('separates the steps of a test from those of the agent it handed off to', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);
        const handoff = (id: string, timestamp: number, state: string) => ({ id, type: 'handoff', context: { id: 'context-1' }, timestamp, state, name: 'logged in' });

        await importFile(gui, 'handoff.puth', encode([
            contextPacket(),
            command('c1', 'visit', ['http://app.test/login'], 2),
            handoff('h1', 3, 'waiting'),
            handoff('h2', 4, 'claimed'),
            annotation('a1', 5, { kind: 'tool', tool: 'puth_run', summary: 'click' }),
            command('c2', 'click', ['#save'], 6),
            handoff('h3', 7, 'ended'),
            command('c3', 'assertSee', ['Saved'], 8),
        ]));

        await gui.waitForText('crafted run');
        await gui.assertSeeIn('[puth="handoff"]', 'Handed back to the test');
        await gui.assertSee('Before the handoff');
        await gui.assertSee('After the handoff');
        assert.strictEqual(await gui.evaluate(`document.querySelectorAll('[puth="step"]').length`), 3);
    }, 30000);
});

describe('Steps', () => {
    it('are split into the pages they ran on', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);
        const command = (id: string, func: string, args: unknown[], started: number) => ({
            id, type: 'command', context: { id: 'context-1' }, on: { type: 'Browser', path: [] }, func, args, errors: [], snapshots: {},
            time: { started, finished: started + 10, took: 10, elapsed: started }, timestamp: started,
        });
        const navigation = (id: string, timestamp: number, url: string, extra = {}) => ({ id, type: 'navigation', context: { id: 'context-1' }, timestamp, url, ...extra });

        await importFile(gui, 'pages.puth', encode([
            contextPacket(),
            navigation('n0', 2, 'about:blank'),
            command('c1', 'visit', ['http://app.test/login'], 10),
            navigation('n1', 15, 'http://app.test/login'),
            command('c2', 'click', ['#submit'], 30),
            navigation('n2', 35, 'http://app.test/dashboard'),
            command('c3', 'assertSee', ['Welcome'], 50),
            command('c4', 'setContent', ['<title>Cart</title>'], 60),
            navigation('n3', 65, 'about:blank', { initiator: 'setContent', title: 'Cart' }),
            command('c5', 'assertSee', ['Cart'], 80),
        ]));

        await gui.waitForText('crafted run');
        const dividers = JSON.parse(await gui.evaluate(`JSON.stringify([...document.querySelectorAll('[puth="page-divider"]')].map((divider) => divider.innerText.replace(/\\s+/g, ' ').trim()))`));
        assert.deepEqual(dividers, ['→ app.test/login', '→ /dashboard', '→ Cart setContent']);

        // A page opened by a command sits above it, one a command led to below it.
        const order = JSON.parse(await gui.evaluate(`JSON.stringify([...document.querySelectorAll('[puth="page-divider"], [puth="step"]')].map((element) => element.matches('[puth="page-divider"]') ? 'page' : element.innerText.split(/\\s+/)[1]))`));
        assert.deepEqual(order, ['page', 'visit', 'click', 'page', 'assertSee', 'page', 'setContent', 'assertSee']);
    }, 30000);
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
