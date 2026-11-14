import { afterEach, assert, describe, it, vi } from 'vitest';
import Context from '../src/Context';
import { Call } from '../src/utils/Call';
import { makeLocalPuthClient } from './helper';

const cleanups: (() => Promise<unknown>)[] = [];

afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('Portal request bodies in Chrome', () => {
    // Answers every portal request with a page, and returns the body of the first POST as the client receives it.
    async function postThroughPortal(body: string) {
        const client = makeLocalPuthClient();
        cleanups.push(() => client.destroy());

        const puth = client.getPuth();
        let context!: Context;
        puth.on('context:created', (event) => { context = event.context; });
        await puth.contextCreate({ portal: true, detour: false, supports: { portal: { urlPrefixes: ['http://example.test'] } } });

        const { context: browserContext } = await context.createBrowserRef();
        const page = (await browserContext.pages())[0];
        const stack = context.callStacks.get(page)!;
        const call = new Call({ function: 'click' }, Promise.withResolvers(), {});
        stack.activeCall = call;

        let forwarded = call.response.promise as Promise<any>;
        const answer = async (request: any, status = 200, html = '') => {
            const next = Promise.withResolvers<any>();
            await stack.handlePortalResponse({
                psuri: request.psuri, type: 'PortalResponse', status, headers: { 'Content-Type': 'text/html' }, body: btoa(html),
            }, next);
            forwarded = next.promise;
        };

        const navigation = page.goto('http://example.test/');
        await answer((await forwarded).value.request, 200, '<title>page</title>');
        await navigation;

        const posted = page.evaluate(body);
        let request = (await forwarded).value.request;
        while (request.method !== 'POST') {
            await answer(request, 404);
            request = (await forwarded).value.request;
        }
        await answer(request);
        await posted;

        return Buffer.from(request.data, 'base64');
    }

    it('keeps every byte of a binary body', async () => {
        const received = await postThroughPortal(`fetch('/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: new Uint8Array(Array.from({ length: 256 }, (_, index) => index)),
        }).then(() => true)`);

        assert.deepEqual([...received], Array.from({ length: 256 }, (_, index) => index));
    }, 20000);

    it('reads multipart bodies with files from memory without a detour', async () => {
        const received = await postThroughPortal(`(() => {
            const data = new FormData();
            data.append('file', new File([new Uint8Array([0, 128, 255])], 'binary.bin'));
            return fetch('/upload', { method: 'POST', body: data }).then(() => true);
        })()`);

        assert.isTrue(received.includes(Buffer.from([13, 10, 13, 10, 0, 128, 255, 13, 10])));
    }, 20000);

    it('keeps text in UTF-8', async () => {
        const received = await postThroughPortal(`fetch('/upload', { method: 'POST', body: 'grüße ✓' }).then(() => true)`);

        assert.strictEqual(received.toString('utf8'), 'grüße ✓');
    }, 20000);
});
