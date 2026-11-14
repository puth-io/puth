import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decode, encode } from '@msgpack/msgpack';
import { type Browser, Context, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';
import { fixtureUrl, makePuthServer } from '../helper';
import { LiveViewSnapshotPlugin } from '../../src/plugins/LiveViewPlugin';
import { PUTH_EXTENSION_CODEC } from '../../src/handlers/WebsocketHandler';
import { SNAPSHOT_VERSION } from '@puth/core';
import http from 'node:http';
import { NORMALIZE } from '../dom-normalize';

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
    const context = await createContext(instance, { snapshot: true, frames: true, test: { name: 'failed checkout' } });
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
    snapshotVersion: SNAPSHOT_VERSION,
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
        // The recorded DOM is the default view, frames remain one click away.
        await gui.assertVisible('[puth="replay-frame"]');
        await gui.click('[puth="view-frame"]');
        await gui.assertVisible('img[src^="blob:"], img[src^="data:"]');
        // Frames are kept as Chrome sends them; the GUI shows the viewport from the top.
        assert.strictEqual(await gui.evaluate(`getComputedStyle(document.querySelector('img[src^="blob:"]')).objectPosition`), '50% 0%');
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

describe('Compressed recordings', () => {
    // Counts the websocket messages the GUI gets compressed with zstd, from now on.
    const countCompressed = (gui: Browser) => gui.evaluate(`(() => {
        window.zstdMessages = 0;
        const Original = window.WebSocket;
        window.WebSocket = class extends Original {
            constructor(...args) {
                super(...args);
                this.addEventListener('message', (event) => {
                    const bytes = new Uint8Array(event.data);
                    if (bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd) window.zstdMessages++;
                });
            }
        };
    })()`);

    it('opens a file Puth saved', async () => {
        const instance = await startInstance();
        const context = await createContext(instance, { snapshot: true, test: { name: 'saved run' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await browser.evaluate('1');
        await context.destroy({ immediately: true, save: { to: 'file', location: path.relative(process.cwd(), directory) } });

        const [file] = readdirSync(directory);
        const saved = readFileSync(path.join(directory, file));
        assert.deepEqual(Array.from(saved.subarray(0, 4)), [0x28, 0xb5, 0x2f, 0xfd]);

        const gui = await openGui(instance);
        await importFile(gui, 'saved.puth', saved);
        await gui.waitForText('saved run');
        await gui.waitFor('[puth="step"]');
    }, 30000);

    it('come compressed over the websocket, the recordings at first and large packets later', async () => {
        const instance = await startInstance();
        const gui = await openGui(instance);
        await countCompressed(gui);
        await connect(gui, instance);
        await gui.waitUntil('window.zstdMessages === 1');

        // A page large enough that its keyframe is compressed on the way.
        const context = await createContext(instance, { snapshot: true, test: { name: 'large page' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent(`<ul>${Array.from({ length: 2000 }, (_, i) => `<li>Entry ${i}</li>`).join('')}</ul><p id="last">the end</p>`);
        await browser.evaluate('1');
        await context.destroy({ immediately: true });

        await gui.waitForText('large page');
        await gui.waitUntil('window.zstdMessages > 1');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');
        await gui.click('[puth="state-before"]');
        await gui.waitUntil(`(() => {
            const frame = document.querySelector('[puth="replay-frame"]');
            return frame?.contentDocument?.getElementById('last')?.textContent === 'the end';
        })()`);
    }, 40000);
});

describe('Snapshot import errors', () => {
    it.each([
        ['bytes that are not msgpack', Uint8Array.from([0xc1, 0xc1, 0xc1]), 'not a Puth snapshot'],
        ['something other than a list', encode({ type: 'context' }), 'does not contain any packets'],
        ['an empty list', encode([]), 'does not contain any packets'],
        ['no leading context packet', encode([{ type: 'log' }]), 'does not start with a context packet'],
        ['a newer version', encode([contextPacket({ snapshotVersion: 99 })]), 'Snapshot version 99 is not supported'],
        ['a file of version 1', encode([contextPacket({ snapshotVersion: undefined })]), 'Snapshot version 1 is not supported'],
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

// Serves a page with a stylesheet and an image, so a replay can show whether it got them from the recording.
async function startAssetServer() {
    const server = http.createServer((request, response) => {
        if (request.url === '/style.css') {
            response.writeHead(200, { 'content-type': 'text/css' }).end('p { color: rgb(1, 2, 3) } .box { background-image: url(/dot.svg) }');
        } else if (request.url === '/dot.svg') {
            response.writeHead(200, { 'content-type': 'image/svg+xml' }).end('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>');
        } else {
            response.writeHead(200, { 'content-type': 'text/html' }).end(
                '<!doctype html><html><head><title>Shop</title><link rel="stylesheet" href="/style.css"></head>'
                + '<body><p id="greeting">hello</p><img id="logo" src="/dot.svg"><div class="box"></div><ul id="list"></ul></body></html>',
            );
        }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const close = () => new Promise((resolve) => server.close(resolve));
    cleanups.push(close);

    return { origin: `http://127.0.0.1:${(server.address() as any).port}`, close };
}

// The GUI's replay frame once it shows the point it was given.
const replayShown = `(() => {
    const frame = document.querySelector('[puth="replay-frame"]');
    return frame !== null && frame.dataset.point !== undefined && frame.dataset.shown === frame.dataset.point;
})()`;
const inReplay = (expression: string) => `((doc) => ${expression})(document.querySelector('[puth="replay-frame"]').contentDocument)`;

describe('DOM replay', () => {
    async function recordShop(instance, origin: string) {
        const context = await createContext(instance, { snapshot: true, test: { name: 'shop run' } });
        const browser = await context.createBrowserShim();
        await browser.visit(origin + '/');
        await browser.evaluate(`(() => {
            document.getElementById('greeting').textContent = 'hello again';
            for (const item of ['one', 'two']) document.getElementById('list').append(Object.assign(document.createElement('li'), { textContent: item }));
        })()`);
        // Reads the page and changes nothing, so its Before is the page this returns.
        const expected = await browser.evaluate(`(${NORMALIZE})(document)`);
        await browser.evaluate(`document.getElementById('list').remove()`);
        await context.destroy({ immediately: true });

        return expected;
    }

    async function showStep(gui: Browser, index: number, state: 'before'|'after') {
        await gui.click(`[puth="step"]:nth-of-type(1)`).catch(() => {});
        const steps = await gui.evaluate(`[...document.querySelectorAll('[puth="step"]')].map((step) => step.dataset.command)`);
        await gui.click(`[puth="step"][data-command="${steps.at(index)}"]`);
        await gui.click(`[puth="state-${state}"]`);
        await gui.waitUntil(replayShown);
    }

    it('rebuilds the recorded DOM of a step with its stylesheets and images', async () => {
        const instance = await startInstance();
        const { origin } = await startAssetServer();
        const expected = await recordShop(instance, origin);

        const gui = await openGui(instance);
        await connect(gui, instance);
        await gui.waitForText('shop run');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');

        // The step that read the page, before it ran.
        await showStep(gui, -2, 'before');
        assert.strictEqual(await gui.evaluate(inReplay(`(${NORMALIZE})(doc)`)), expected);

        // It changed nothing, so its After, the Before of the next step, is the same page.
        await gui.click('[puth="state-after"]');
        await gui.waitUntil(replayShown);
        assert.strictEqual(await gui.evaluate(inReplay(`(${NORMALIZE})(doc)`)), expected);

        // The last step removed the list; its After is where the recording ends.
        await showStep(gui, -1, 'after');
        await gui.waitUntil(inReplay(`doc.getElementById('list') === null && doc.getElementById('greeting') !== null`));

        // Served by the replay worker from the recording.
        await gui.waitUntil(inReplay(`getComputedStyle(doc.getElementById('greeting')).color === 'rgb(1, 2, 3)'`));
        await gui.waitUntil(inReplay(`doc.getElementById('logo').naturalWidth === 8`));
        const escaped = await gui.evaluate(inReplay(`JSON.stringify(doc.defaultView.performance.getEntriesByType('resource')
            .filter((entry) => ! (entry.workerStart > 0)).map((entry) => entry.name))`));
        assert.deepEqual(JSON.parse(escaped), []);
    }, 60000);

    it('replays an imported snapshot after the application is gone', async () => {
        const instance = await startInstance();
        const { origin, close } = await startAssetServer();
        const expected = await recordShop(instance, origin);

        const live = await openGui(instance);
        await connect(live, instance);
        await live.waitForText('shop run');
        await live.click('[puth="history-item"]');
        await live.waitFor('[puth="step"]');
        const snapshot = await exportActiveContext(live);
        await close();

        const gui = await openGui(instance);
        await importFile(gui, 'shop.puth', snapshot);
        await gui.waitForText('shop run');
        await showStep(gui, -2, 'before');

        assert.strictEqual(await gui.evaluate(inReplay(`(${NORMALIZE})(doc)`)), expected);
        await gui.waitUntil(inReplay(`getComputedStyle(doc.getElementById('greeting')).color === 'rgb(1, 2, 3)'`));
        await gui.waitUntil(inReplay(`doc.getElementById('logo').naturalWidth === 8`));
    }, 60000);

    it('rebuilds frames of other sites, nested', async () => {
        // 127.0.0.1 and localhost are different sites, so cross and deep run in processes of their own.
        const server = http.createServer((request, response) => {
            const port = (server.address() as any).port;
            const pages = {
                '/top': `<h1>top</h1><iframe id="same" src="/same"></iframe><iframe id="cross" src="http://localhost:${port}/cross"></iframe><iframe id="blank"></iframe>`
                    + `<script>document.getElementById('blank').contentDocument.body.innerHTML = '<b>blank content</b>'</script>`,
                '/same': `<p id="p">same</p><script>setTimeout(() => document.getElementById('p').textContent = 'same changed', 50)</script>`,
                '/cross': `<p>cross</p><iframe id="deep" src="http://127.0.0.1:${port}/deep"></iframe>`,
                '/deep': `<p>deep</p>`,
            };
            response.writeHead(200, { 'content-type': 'text/html' }).end(pages[request.url] ?? '');
        });
        await new Promise<void>((resolve) => server.listen(0, '0.0.0.0', resolve));
        cleanups.push(() => new Promise((resolve) => server.close(resolve)));
        const port = (server.address() as any).port;

        const instance = await startInstance();
        const context = await createContext(instance, { snapshot: true, test: { name: 'frame run' } });
        const browser = await context.createBrowserShim();
        await browser.visit(`http://127.0.0.1:${port}/top`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await browser.evaluate('1');
        await context.destroy({ immediately: true });

        const gui = await openGui(instance);
        await connect(gui, instance);
        await gui.waitForText('frame run');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');
        await showStep(gui, -1, 'before');

        const frame = (path: string) => `doc.getElementById(${path.split('/').map((id) => JSON.stringify(id)).join(').contentDocument.getElementById(')}).contentDocument`;
        await gui.waitUntil(inReplay(`${frame('cross/deep')}.body.innerText === 'deep'`));
        assert.strictEqual(await gui.evaluate(inReplay(`${frame('cross')}.querySelector('p').innerText`)), 'cross');
        assert.strictEqual(await gui.evaluate(inReplay(`${frame('same')}.getElementById('p').innerText`)), 'same changed');
        assert.strictEqual(await gui.evaluate(inReplay(`${frame('blank')}.body.innerText`)), 'blank content');

        // Every nested replay frame is controlled by the replay worker, so nothing in them reaches the network.
        for (const path of ['same', 'cross', 'cross/deep', 'blank']) {
            assert.isTrue(await gui.evaluate(inReplay(`${frame(path)}.defaultView.navigator.serviceWorker.controller !== null`)), path);
            const escaped = await gui.evaluate(inReplay(`JSON.stringify(${frame(path)}.defaultView.performance.getEntriesByType('resource').filter((entry) => entry.workerStart === 0).map((entry) => entry.name))`));
            assert.deepEqual(JSON.parse(escaped), [], path);
        }
    }, 60000);

    it('follows a frame that navigates while the page around it stays the same', async () => {
        const server = http.createServer((request, response) => {
            const pages = {
                '/top': `<h1>top</h1><iframe id="inner" src="/one"></iframe>`,
                '/one': '<p>page one</p>',
                '/two': '<p>page two</p>',
            };
            response.writeHead(200, { 'content-type': 'text/html' }).end(pages[request.url] ?? '');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        cleanups.push(() => new Promise((resolve) => server.close(resolve)));

        const instance = await startInstance();
        const context = await createContext(instance, { snapshot: true, test: { name: 'frame navigation' } });
        const browser = await context.createBrowserShim();
        await browser.visit(`http://127.0.0.1:${(server.address() as any).port}/top`);
        await browser.evaluate(`new Promise((resolve) => setTimeout(resolve, 200))`);
        // Navigates from inside the frame, so the page around it doesn't change at all.
        await browser.evaluate(`(document.getElementById('inner').contentWindow.location.href = '/two', new Promise((resolve) => setTimeout(resolve, 300)))`);
        await browser.evaluate('1');
        await context.destroy({ immediately: true });

        const gui = await openGui(instance);
        await connect(gui, instance);
        await gui.waitForText('frame navigation');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');

        const inner = inReplay(`doc.getElementById('inner').contentDocument.body.innerText`);
        await showStep(gui, -1, 'before');
        assert.strictEqual(await gui.evaluate(inner), 'page two');
        await showStep(gui, -2, 'before');
        assert.strictEqual(await gui.evaluate(inner), 'page one');
        // The step's After differs from its Before in the frame only.
        await gui.click('[puth="state-after"]');
        await gui.waitUntil(replayShown);
        assert.strictEqual(await gui.evaluate(inner), 'page two');
    }, 60000);

    it('restores scroll positions, also of frames and at the end of a page', async () => {
        const server = http.createServer((request, response) => {
            const pages = {
                '/top': `<style>body { margin: 0 } #box { width: 200px; height: 80px; overflow: auto } #inner { height: 600px }
                    #tall { height: 1500px }</style><div id="box"><div id="inner">box</div></div>
                    <iframe id="frame" src="/frame" style="width: 300px; height: 120px"></iframe><div id="tall">tall</div>`,
                '/frame': '<style>body { margin: 0; height: 1000px }</style><p>frame</p>',
            };
            response.writeHead(200, { 'content-type': 'text/html' }).end(pages[request.url] ?? '');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        cleanups.push(() => new Promise((resolve) => server.close(resolve)));

        const instance = await startInstance();
        const context = await createContext(instance, { snapshot: true, test: { name: 'scroll run' } });
        const browser = await context.createBrowserShim();
        await browser.resize(800, 600);
        await browser.visit(`http://127.0.0.1:${(server.address() as any).port}/top`);
        // As far down as the page goes, which a larger replay frame would cut short.
        const expected = await browser.evaluate(`(() => {
            scrollTo(0, document.documentElement.scrollHeight);
            document.getElementById('box').scrollTop = 250;
            document.getElementById('frame').contentWindow.scrollTo(0, 400);
            return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() =>
                resolve(JSON.stringify([scrollY, document.getElementById('box').scrollTop, document.getElementById('frame').contentWindow.scrollY])))));
        })()`);
        await browser.evaluate('1');
        await context.destroy({ immediately: true });

        const gui = await openGui(instance);
        await connect(gui, instance);
        await gui.waitForText('scroll run');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');
        await showStep(gui, -1, 'before');

        assert.strictEqual(await gui.evaluate(inReplay(`JSON.stringify([doc.defaultView.scrollY, doc.getElementById('box').scrollTop,
            doc.getElementById('frame').contentWindow.scrollY])`)), expected);
    }, 60000);

    it('runs no script and follows no link of the recorded page', async () => {
        const instance = await startInstance();
        const context = await createContext(instance, { snapshot: true, test: { name: 'script run' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent(`<a id="away" href="${fixtureUrl('/html?body=away')}">away</a>
            <button id="button" onclick="document.body.dataset.ran = 'handler'">button</button>
            <script>document.body.dataset.ran = 'script'</script>`);
        await browser.evaluate('1');
        await context.destroy({ immediately: true });

        const gui = await openGui(instance);
        await connect(gui, instance);
        await gui.waitForText('script run');
        await gui.click('[puth="history-item"]');
        await gui.waitFor('[puth="step"]');
        await showStep(gui, -1, 'before');

        // The recorded page's script did run there, the replay shows its result but runs nothing itself.
        assert.strictEqual(await gui.evaluate(inReplay(`doc.body.dataset.ran`)), 'script');
        await gui.evaluate(inReplay(`(doc.body.dataset.ran = 'replay', doc.getElementById('button').click(), doc.getElementById('away').click())`));
        await new Promise((resolve) => setTimeout(resolve, 300));
        assert.strictEqual(await gui.evaluate(inReplay(`doc.body.dataset.ran`)), 'replay');
        assert.include(await gui.evaluate(`document.querySelector('[puth="replay-frame"]').contentWindow.location.pathname`), '/__replay/frame.html');
    }, 60000);
});
