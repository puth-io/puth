// Measures recording cost for long runs and concurrent contexts. See dev/TESTING.md.
//
//   npm -w puth run benchmark -- [--src <puth source>] [--commands 400] [--contexts 4] [--pause 25] [--dom both] [--nodes 0]
//
// --src selects the Puth source to measure, which allows comparing against an older checkout.
// --pause is the time in ms between commands of a context, which gives the screencast time to deliver frames.
// --dom runs each scenario with the DOM recording on, off, or both (a source without it ignores the option).
// --nodes adds that many elements to the page first, for the cost of keyframes and changes on large pages.
import path from 'node:path';
import { parseArgs } from 'node:util';
import { encode } from '@msgpack/msgpack';
// @ts-ignore plain ESM helper
import { startFixtures } from '../fixtures/server.mjs';

const { values } = parseArgs({
    options: {
        src: { type: 'string', default: 'src' },
        commands: { type: 'string', default: '400' },
        contexts: { type: 'string', default: '4' },
        pause: { type: 'string', default: '25' },
        dom: { type: 'string', default: 'both' },
        nodes: { type: 'string', default: '0' },
    },
});

const src = path.resolve(values.src!);
const commands = Number(values.commands);
const contexts = Number(values.contexts);
const pause = Number(values.pause);
const nodes = Number(values.nodes);
const domModes = values.dom === 'both' ? [false, true] : [values.dom === 'on'];

// Puth has to load before its plugins, they import each other.
const { LocalPuthClient } = await import(path.join(src, 'LocalPuthClient.ts'));
const { PuthStandardPlugin } = await import(path.join(src, 'plugins/PuthStandardPlugin.ts'));
const { LiveViewSnapshotPlugin } = await import(path.join(src, 'plugins/LiveViewPlugin.ts'));
const { usableBrowserInstallations } = await import(path.join(src, 'utils/Platform.ts'));
const { PUTH_EXTENSION_CODEC } = await import(path.join(src, 'handlers/WebsocketHandler.ts'));

const logger = { info() {}, debug() {}, warn() {}, error() {} };
const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const round = (value: number) => Math.round(value * 100) / 100;
const mib = (bytes: number) => round(bytes / 1024 / 1024);

async function runContext(client, url: string, count: number, latencies: number[], dom: boolean) {
    const context = await client.contextCreate({ snapshot: true, dom });
    const browser = await context.createBrowser();
    const page = (await browser.pages())[0];
    await page.goto(url);
    if (nodes > 0) {
        await page.evaluate(`(() => {
            const list = document.body.appendChild(document.createElement('ul'));
            for (let i = 0; i < ${nodes}; i++) {
                list.appendChild(Object.assign(document.createElement('li'), { className: 'item-' + (i % 7), textContent: 'Item ' + i }));
            }
        })()`);
    }

    for (let i = 0; i < count; i++) {
        const startedAt = performance.now();
        await page.evaluate(`(() => {
            console.log('benchmark ${i}');
            const item = document.querySelectorAll('li')[${i} % Math.max(1, ${nodes})];
            if (item) item.textContent = 'Changed ${i}';
            const overlay = document.getElementById('paint')
                ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'paint' }));
            overlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgb(${i % 255}, 40, 90)';
        })()`);
        latencies.push(performance.now() - startedAt);
        await new Promise((resolve) => setTimeout(resolve, pause));
    }

    return context;
}

async function scenario(name: string, url: string, contextCount: number, dom: boolean) {
    const client = new LocalPuthClient({ installedBrowser: usableBrowserInstallations[0], logger });
    client.use(PuthStandardPlugin);
    client.use(LiveViewSnapshotPlugin);

    const puth = client.getPuth();
    const created: any[] = [];
    puth.on('context:created', ({ context }) => created.push(context));

    const latencies: number[] = [];
    const startedAt = performance.now();
    const remotes = await Promise.all(Array.from({ length: contextCount }, () =>
        runContext(client, url, Math.floor(commands / contextCount), latencies, dom)));
    const duration = performance.now() - startedAt;

    // Frames are processed asynchronously, so let the last ones arrive.
    await new Promise((resolve) => setTimeout(resolve, 500));
    (globalThis as any).gc?.();
    const memory = process.memoryUsage();

    let recordingBytes = 0;
    let packets = 0;
    let frames = 0;
    let frameBytes = 0;
    let domBytes = 0;
    let keyframes = 0;
    const size = (items) => encode(items, { extensionCodec: PUTH_EXTENSION_CODEC }).byteLength;
    for (const context of created) {
        const items = puth.snapshotHandler.getAllCachedItemsFrom(context);
        packets += items.length;
        const screencasts = items.filter((item) => item.type === 'screencasts');
        const domItems = items.filter((item) => item.type === 'dom' || item.type === 'dom-resource');
        frames += screencasts.length;
        frameBytes += size(screencasts);
        domBytes += size(domItems);
        keyframes += domItems.filter((item) => item.kind === 'keyframe').length;
        recordingBytes += size(items);
    }

    await Promise.allSettled(remotes.map((remote) => remote.destroy({ immediately: true })));
    await client.destroy();

    latencies.sort((a, b) => a - b);

    return {
        scenario: name,
        dom,
        nodes,
        contexts: contextCount,
        commands: latencies.length,
        durationMs: Math.round(duration),
        latencyMs: {
            p50: round(percentile(latencies, 0.5)),
            p95: round(percentile(latencies, 0.95)),
            max: round(latencies.at(-1)!),
        },
        packets,
        frames,
        keyframes,
        recordingMiB: mib(recordingBytes),
        framesMiB: mib(frameBytes),
        domMiB: mib(domBytes),
        memoryMiB: { rss: mib(memory.rss), heapUsed: mib(memory.heapUsed) },
    };
}

const fixtures = await startFixtures({ primaryUrl: 'http://127.0.0.1:0', altUrl: 'http://localhost:0', host: '127.0.0.1' });
const results: any[] = [];
for (const dom of domModes) {
    results.push(await scenario('long run', fixtures.primaryUrl, 1, dom));
    results.push(await scenario('concurrent contexts', fixtures.primaryUrl, contexts, dom));
}
await fixtures.close();

console.log(JSON.stringify({ src: values.src, results }, null, 2));
process.exit(0);
