import { afterEach, assert, describe, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Context from '../src/Context';
import { Puth } from '../src/Puth';
import { Call } from '../src/utils/Call';
import { installedBrowser } from './helper';

const cleanups: (() => Promise<unknown>)[] = [];

afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

// Pages served through the portal are not a secure context, so Chrome blocks their requests to loopback.
describe('Portal detours in Chrome', () => {
    it('upload a file from disk, while the page still cannot reach the Puth API', async () => {
        const puth = new Puth({
            staticDir: false,
            installedBrowser,
            logger: { info() {}, debug() {}, warn() {}, error() {} },
        });
        cleanups.push(() => puth.destroy());
        await puth.serve(0, '127.0.0.1').ready();

        let context!: Context;
        puth.on('context:created', (event) => { context = event.context; });
        await puth.contextCreate({ portal: true, detour: true, supports: { portal: { urlPrefixes: ['http://example.test'] } } });

        const { context: browserContext } = await context.createBrowserRef();
        const page = (await browserContext.pages())[0];
        const stack = context.callStacks.get(page)!;
        const call = new Call({ function: 'click' }, Promise.withResolvers(), {});
        stack.activeCall = call;

        const navigation = page.goto('http://example.test/form');
        const documentRequest = (await call.response.promise as any).value.request;
        const next = Promise.withResolvers<any>();
        await stack.handlePortalResponse({
            psuri: documentRequest.psuri,
            type: 'PortalResponse',
            status: 200,
            headers: { 'Content-Type': 'text/html' },
            body: btoa('<input type="file" id="file">'),
        }, next);
        await navigation;

        const file = join(tmpdir(), `puth-detour-${process.pid}.txt`);
        writeFileSync(file, 'from disk');
        await (await page.$('#file') as any).uploadFile(file);

        // Chrome leaves out the content of files from disk, so this upload has to take the detour.
        const upload = page.evaluate(`(() => {
            const data = new FormData();
            data.append('files[0]', document.querySelector('#file').files[0]);
            return fetch('/upload', { method: 'POST', body: data }).then(response => response.text(), error => String(error));
        })()`);
        // A blocked upload never reaches the portal, so it fails the test right away.
        const blocked = upload.then((result) => { throw new Error(`The upload did not reach the portal: ${result}`); });
        let uploadRequest = (await Promise.race([next.promise, blocked])).value.request;
        while (uploadRequest.path !== '/upload') {
            // For example the favicon of the page.
            const following = Promise.withResolvers<any>();
            await stack.handlePortalResponse({
                psuri: uploadRequest.psuri, type: 'PortalResponse', status: 404, headers: {}, body: '',
            }, following);
            uploadRequest = (await Promise.race([following.promise, blocked])).value.request;
        }
        assert.match(uploadRequest.headers['content-type'], /^multipart\/form-data; boundary=/);
        assert.include(atob(uploadRequest.data), 'from disk');

        await stack.handlePortalResponse({
            psuri: uploadRequest.psuri, type: 'PortalResponse', status: 200, headers: {}, body: btoa('uploaded'),
        }, { resolve: vi.fn() });
        assert.strictEqual(await upload, 'uploaded');

        const api = await page.evaluate(`fetch(${JSON.stringify(new URL('health', puth.http.url).toString())}, { mode: 'no-cors' })
            .then(() => 'reached', () => 'blocked')`);
        assert.strictEqual(api, 'blocked');
    }, 30000);
});
