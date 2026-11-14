import { afterEach, assert, describe, expect, it, vi } from 'vitest';
import Context from '../src/Context';
import { Puth } from '../src/Puth';
import { Call } from '../src/utils/Call';
import { CallStack } from '../src/utils/CallStack';
import { fixtureUrl, makeLocalPuthClient } from './helper';

const cleanups: (() => Promise<unknown>)[] = [];

afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('Portal failures in Chrome', () => {
    async function portalRequest() {
        const client = makeLocalPuthClient();
        cleanups.push(() => client.destroy());

        const puth = client.getPuth();
        let context!: Context;
        puth.on('context:created', (event) => { context = event.context; });
        await puth.contextCreate({ portal: true, detour: false, supports: { portal: { urlPrefixes: [fixtureUrl()] } } });

        const { context: browserContext } = await context.createBrowserRef();
        const page = (await browserContext.pages())[0];
        const stack = context.callStacks.get(page)!;
        const call = new Call({ function: 'click' }, Promise.withResolvers(), {});
        stack.activeCall = call;

        const navigation = page.goto(fixtureUrl('/through-portal')).catch((error) => error);
        const forwarded = await call.response.promise as any;

        return { stack, navigation, psuri: forwarded.value.request.psuri };
    }

    it('fails the browser request with the reported network error', async () => {
        const { stack, navigation, psuri } = await portalRequest();

        await stack.handlePortalResponse({
            psuri, type: 'PortalResponse', error: { reason: 'ConnectionRefused', message: 'refused' },
        }, { resolve: vi.fn() });

        expect((await navigation).message).toContain('net::ERR_CONNECTION_REFUSED');
    });

    it('delivers an HTTP error response as a page', async () => {
        const { stack, navigation, psuri } = await portalRequest();

        await stack.handlePortalResponse({
            psuri,
            type: 'PortalResponse',
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
            body: btoa('unavailable'),
        }, { resolve: vi.fn() });

        assert.strictEqual((await navigation).status(), 503);
    });
});

describe('Portal failures over HTTP', () => {
    // Substitutes only Chrome's transport, so requests reach the real detour endpoint.
    async function detourRequest({ activeCall = true } = {}) {
        const puth = new Puth({
            staticDir: false,
            cors: { enabled: false },
            logger: { info() {}, debug() {}, warn() {}, error() {} },
        });
        cleanups.push(() => puth.destroy());

        const server = puth.serve(0, '127.0.0.1');
        await server.ready();

        let context!: Context;
        puth.on('context:created', (event) => { context = event.context; });
        await puth.contextCreate({ portal: true, detour: true });

        const page = {} as any;
        const stack = new CallStack(context, page);
        context.callStacks.set(page, stack);
        const call = new Call({ function: 'click' }, Promise.withResolvers(), {});
        if (activeCall) {
            stack.activeCall = call;
        }

        const abort = new AbortController();
        let detour!: Promise<Response>;
        const sent = Promise.withResolvers<void>();
        const cdp = {
            async send(_method: string, params: any) {
                detour = fetch(params.url, {
                    method: 'POST',
                    headers: Object.fromEntries(params.headers.map(({ name, value }) => [name, value])),
                    body: 'upload body',
                    signal: abort.signal,
                });
                void detour.catch(() => {});
                sent.resolve();
                return {};
            },
        };

        await stack.onPortalRequest({
            requestId: 'fetch-1',
            request: {
                url: 'http://example.test/upload',
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
                hasPostData: true,
                postData: 'upload body',
            },
        } as any, '/upload', cdp as any);
        await sent.promise;

        return { puth, server, context, stack, call, abort, detour: () => detour };
    }

    const forwardedPsuri = async ({ call }) => ((await call.response.promise) as any).value.request.psuri;

    it('forwards the headers of the page request as a plain object', async () => {
        const session = await detourRequest();
        const { headers } = ((await session.call.response.promise) as any).value.request;

        // The client receives the request as JSON.
        const forwarded = JSON.parse(JSON.stringify(headers));
        assert.strictEqual(forwarded['content-type'], 'multipart/form-data; boundary=test');
        assert.deepEqual(Object.keys(forwarded).filter((name) => name === 'host' || name.startsWith('puth-portal-')), []);
    });

    it('reports a failure with a marked 502', async () => {
        const session = await detourRequest();
        const psuri = await forwardedPsuri(session);

        await session.stack.handlePortalResponse({
            psuri, type: 'PortalResponse', error: { reason: 'ConnectionReset', message: 'upstream reset' },
        }, { resolve: vi.fn() });

        const response = await session.detour();
        assert.strictEqual(response.status, 502);
        assert.strictEqual(response.headers.get('puth-portal-error'), 'ConnectionReset');
        assert.strictEqual(await response.text(), 'upstream reset');
    });

    it('passes valid HTTP error responses through unmarked', async () => {
        const session = await detourRequest();
        const psuri = await forwardedPsuri(session);

        await session.stack.handlePortalResponse({
            psuri, type: 'PortalResponse', status: 502, headers: {}, body: btoa('from the application'),
        }, { resolve: vi.fn() });

        const response = await session.detour();
        assert.isNull(response.headers.get('puth-portal-error'));
        assert.strictEqual(await response.text(), 'from the application');
    });

    it.each([204, 304])('delivers a %i response, which cannot have a body', async (status) => {
        const session = await detourRequest();
        const psuri = await forwardedPsuri(session);

        await session.stack.handlePortalResponse({
            psuri, type: 'PortalResponse', status, headers: {}, body: '',
        }, { resolve: vi.fn() });

        assert.strictEqual((await session.detour()).status, status);
    });

    it('settles when the response body cannot be decoded', async () => {
        const session = await detourRequest();
        const psuri = await forwardedPsuri(session);

        await session.stack.handlePortalResponse({
            psuri, type: 'PortalResponse', status: 200, headers: {}, body: 'not base64!',
        }, { resolve: vi.fn() });

        const response = await session.detour();
        assert.strictEqual(response.status, 502);
        assert.strictEqual(response.headers.get('puth-portal-error'), 'Failed');
    });

    it('settles a pending detour when the context is destroyed', async () => {
        const session = await detourRequest();
        await forwardedPsuri(session);

        await session.context.destroy({ immediately: true });

        assert.strictEqual((await session.detour()).status, 502);
        assert.strictEqual(session.context.psuriCache.size, 0);
    });

    it('forgets a detour the browser abandoned', async () => {
        const session = await detourRequest({ activeCall: false });
        await vi.waitFor(() => assert.lengthOf(session.stack.portal.queue.backlog, 1));

        session.abort.abort();

        await vi.waitFor(() => assert.lengthOf(session.stack.portal.queue.backlog, 0));
        assert.strictEqual(session.context.psuriCache.size, 0);
    });

    it('keeps a healthy detour after its request body was consumed', async () => {
        const session = await detourRequest({ activeCall: false });
        await vi.waitFor(() => assert.lengthOf(session.stack.portal.queue.backlog, 1));

        await new Promise((resolve) => setTimeout(resolve, 100));

        assert.lengthOf(session.stack.portal.queue.backlog, 1);
        session.abort.abort();
    });

    it('fails pending portal work when the client waiting on /portal/response disconnects', async () => {
        const session = await detourRequest();
        const psuri = await forwardedPsuri(session);
        const client = new AbortController();
        const reply = fetch(new URL('portal/response', session.server.url!), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: { id: session.context.id },
                response: { psuri, type: 'PortalResponse', status: 200, headers: {}, body: '' },
            }),
            signal: client.signal,
        }).catch((error) => error);
        await vi.waitFor(() => assert.isOk(session.stack.portal.open.response));

        client.abort();
        await reply;

        await vi.waitFor(() => assert.isNotOk(session.stack.portal.open.response));
    });
});
