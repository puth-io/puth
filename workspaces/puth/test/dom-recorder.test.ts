import { readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { afterEach, assert, describe, it } from 'vitest';
import { fixtureUrl, makeLocalPuthClient } from './helper';
import { PuthStandardPlugin } from '../src/plugins/PuthStandardPlugin';
import { NORMALIZE } from './dom-normalize';

// The recorder's packets are replayed with @puth/core's DomReplay, the code the GUI uses, in a second browser.
// At every point a test checks, the rebuilt document has to equal the recorded one.

const cleanups: (() => unknown)[] = [];

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

const CORE = readFileSync(createRequire(import.meta.url).resolve('@puth/core').replace(/index\.cjs$/, 'index.mjs'), 'utf8');

async function record(options = {}) {
    const client = makeLocalPuthClient();
    cleanups.push(() => client.destroy());
    client.use(PuthStandardPlugin);

    let context!: any;
    // The replay's own context comes second and must not take its place.
    client.getPuth().on('context:created', (event) => { context ??= event.context; });
    const remote = await client.contextCreate({ snapshot: true, ...options });
    const browser = await remote.createBrowserShim();
    await browser.setTimeout(2000);

    // The replay runs in a context of its own, which records nothing.
    const replayContext = await client.contextCreate({});
    const replay = await replayContext.createBrowserShim();
    await replay.visit(fixtureUrl('/plain.txt'));
    await replay.setContent('<iframe id="replay"></iframe>');
    await replay.evaluate(`(() => {
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = ${JSON.stringify(CORE)} + '\\nwindow.DomReplay = DomReplay; window.domPacketsUntil = domPacketsUntil;';
        document.head.append(script);
    })()`);
    for (let i = 0; i < 50 && ! await replay.evaluate('typeof window.DomReplay === "function"'); i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const packets = () => client.getPuth().snapshotHandler.getAllCachedItemsFrom(context) as any[];
    const domPackets = () => packets().filter((packet) => packet.type === 'dom');

    // Expected DOM of the recorded page, read in its main world. The command that reads it changes nothing, so its
    // Before is the state the replay has to show.
    const snapshot = async () => {
        const expected = await browser.evaluate(`(${NORMALIZE})(document)`);
        const command = packets().filter((packet) => packet.type === 'command' && packet.func === 'evaluate').at(-1);
        return { expected, point: command.dom?.before };
    };

    const replayed = async (point: { doc: string, seq: number }) => {
        const list = domPackets().filter((packet) => packet.doc === point.doc).map(({ kind, seq, data }) => ({ kind, seq, data }));
        return replay.evaluate(`(() => {
            const packets = window.domPacketsUntil(${JSON.stringify(list)}, ${point.seq});
            const doc = document.getElementById('replay').contentDocument;
            const replay = new window.DomReplay(doc);
            replay.build(packets[0].data);
            for (const packet of packets.slice(1)) replay.apply(packet.data);
            return (${NORMALIZE})(doc);
        })()`);
    };

    const check = async () => {
        const { expected, point } = await snapshot();
        assert.isDefined(point, 'the command has no DOM point');
        assert.strictEqual(await replayed(point), expected);
        return point;
    };

    return { client, browser, context, packets, domPackets, check, replayed };
}

describe('DOM recording', () => {
    it('replays changes of every kind at command boundaries', async () => {
        const { browser, check } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent(`<!doctype html><html><head><style id="s"></style></head><body>
            <div id="root" class="a"><p>one</p><p>two</p><input id="name"><select id="pick"><option>a</option><option>b</option></select>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4"></circle></svg><textarea id="area">x</textarea></div>
            <script>window.inline = 1</script></body></html>`);
        await check();

        await browser.evaluate(`(() => {
            const root = document.getElementById('root');
            root.setAttribute('class', 'b');
            root.removeAttribute('id');
            root.firstElementChild.textContent = 'changed';
            root.append(Object.assign(document.createElement('span'), { title: 'new', textContent: 'appended' }));
            root.insertBefore(root.lastElementChild, root.firstChild);
            root.querySelector('p:last-of-type').remove();
            root.querySelector('circle').setAttribute('r', '2');
            document.getElementById('s').sheet.insertRule('p { color: red }', 0);
        })()`);
        await check();

        // Values set from code fire no events and change no attributes.
        await browser.evaluate(`(() => {
            document.getElementById('name').value = 'typed from code';
            document.getElementById('pick').selectedIndex = 1;
            document.getElementById('area').value = 'area value';
            document.querySelector('[class=b]').innerHTML = '<b>replaced</b><!-- comment --><i @click="x" onclick="y">it</i>';
        })()`);
        await check();
    }, 30000);

    it('records what typing changes', async () => {
        const { browser, check } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent('<input id="field"><input type="checkbox" id="box">');
        await browser.type('#field', 'hello');
        await browser.check('#box');
        await check();
    }, 30000);

    it('keeps changes made right before a navigation', async () => {
        const { browser, domPackets, replayed } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent('<div id="root">before</div>');

        // The command's flush leaves the recording at the current document.
        await browser.evaluate('1');
        const old = domPackets().at(-1).doc;

        // Changed in the same task that starts the navigation, so only the flush on pagehide can send it.
        const expected = await browser.evaluate(`(() => {
            document.getElementById('root').textContent = 'changed while leaving';
            const expected = (${NORMALIZE})(document);
            location.href = ${JSON.stringify(fixtureUrl('/html?body=next'))};
            return expected;
        })()`);
        await browser.assertSee('next');

        const last = domPackets().filter((packet) => packet.doc === old).at(-1);
        assert.strictEqual(await replayed({ doc: old, seq: last.seq }), expected);

        // The next document starts with a keyframe.
        const next = domPackets().filter((packet) => packet.doc !== old);
        assert.isNotEmpty(next);
        assert.strictEqual(next[0].kind, 'keyframe');
    }, 30000);

    it('replays random changes', async () => {
        const { browser, check } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent('<div id="root"><p>start</p></div>');

        for (let seed = 1; seed <= 6; seed++) {
            await browser.evaluate(`(async () => {
                let state = ${seed};
                const random = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
                const pick = (list) => list[Math.floor(random() * list.length)];
                const root = document.getElementById('root');
                const elements = () => [...root.querySelectorAll('*')];
                const anywhere = () => pick([root, ...elements()].filter((element) => ! ['input', 'svg', 'circle'].includes(element.localName)));
                const make = () => {
                    const tag = pick(['div', 'span', 'p', 'b', 'input', 'svg']);
                    const element = tag === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : document.createElement(tag);
                    if (tag === 'svg') element.append(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
                    else if (tag !== 'input') element.append('t' + Math.floor(random() * 100));
                    if (random() < 0.5) element.setAttribute('data-x', String(Math.floor(random() * 10)));
                    return element;
                };
                const detached = [];
                const step = () => {
                    const element = pick(elements()) ?? root;
                    switch (Math.floor(random() * 9)) {
                        case 0: anywhere().append(make()); break;
                        case 1: if (element !== root) element.remove(); break;
                        case 2: { const parent = anywhere(); if (element !== root && ! element.contains(parent)) parent.prepend(element); break; }
                        case 3: element.setAttribute('class', 'c' + Math.floor(random() * 5)); break;
                        case 4: element.removeAttribute('data-x'); break;
                        case 5: { const text = [...root.querySelectorAll('*')].flatMap((e) => [...e.childNodes]).find((n) => n.nodeType === 3); if (text) text.data += '!'; break; }
                        case 6: { const input = root.querySelector('input'); if (input) input.value = 'v' + Math.floor(random() * 100); break; }
                        case 7: if (element !== root) { element.remove(); detached.push(element); } break;
                        case 8: { const node = detached.pop(); if (node) { node.setAttribute('data-detached', '1'); node.append(make()); anywhere().append(node); } break; }
                    }
                };
                for (let i = 0; i < 40; i++) step();
                // Lets the recorder's timer send a batch in between.
                await new Promise((resolve) => setTimeout(resolve, 80));
                for (let i = 0; i < 40; i++) step();
            })()`);
            await check();
        }
    }, 60000);

    it('takes a new keyframe when a page changes too much at once', async () => {
        const { browser, check, domPackets } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent('<div id="root"></div>');
        const keyframes = domPackets().filter((packet) => packet.kind === 'keyframe').length;

        await browser.evaluate(`(() => {
            const root = document.getElementById('root');
            for (let i = 0; i < 25000; i++) root.append(document.createElement('i'));
            for (let i = 0; i < 24000; i++) root.lastChild.remove();
        })()`);
        await check();
        assert.isAbove(domPackets().filter((packet) => packet.kind === 'keyframe').length, keyframes);
    }, 30000);

    it('masks passwords and card numbers', async () => {
        const { browser, domPackets } = await record();
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.setContent('<input type="password" id="secret"><input autocomplete="cc-number" id="card">');
        await browser.type('#secret', 'hunter2');
        await browser.type('#card', '4242424242424242');
        await browser.evaluate('1');

        const recorded = JSON.stringify(domPackets().map((packet) => packet.data));
        assert.notInclude(recorded, 'hunter2');
        assert.notInclude(recorded, '4242');
    }, 30000);

    it('records the stylesheets and images a document loads', async () => {
        const server = http.createServer((request, response) => {
            if (request.url === '/style.css') {
                response.writeHead(200, { 'content-type': 'text/css' }).end('p { color: rgb(1, 2, 3) }');
            } else if (request.url === '/image.svg') {
                response.writeHead(200, { 'content-type': 'image/svg+xml' }).end('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>');
            } else {
                response.writeHead(200, { 'content-type': 'text/html' }).end('<link rel="stylesheet" href="/style.css"><img src="/image.svg"><p>styled</p>');
            }
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        cleanups.push(() => new Promise((resolve) => server.close(resolve)));
        const origin = `http://127.0.0.1:${(server.address() as any).port}`;

        const { browser, packets } = await record();
        await browser.visit(origin + '/');
        await browser.assertSee('styled');

        const resources = packets().filter((packet) => packet.type === 'dom-resource');
        const css = resources.find((resource) => resource.url === origin + '/style.css');
        assert.strictEqual(css.contentType, 'text/css');
        assert.strictEqual(new TextDecoder().decode(css.content), 'p { color: rgb(1, 2, 3) }');
        assert.isDefined(resources.find((resource) => resource.url === origin + '/image.svg'));
    }, 30000);

    it('records nothing with dom set to false', async () => {
        const { browser, domPackets, packets } = await record({ dom: false });
        await browser.visit(fixtureUrl('/plain.txt'));
        await browser.evaluate('1');
        assert.lengthOf(domPackets(), 0);
        assert.isUndefined(packets().find((packet) => packet.type === 'command').dom);
    }, 30000);
});
