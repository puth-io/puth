import { describe, expect, it } from 'vitest';
import Context from '../../src/Context';
import { Puth } from '../../src/Puth';
import { Return } from '../../src/context/Return';
import { Call } from '../../src/utils/Call';
import { CallStack } from '../../src/utils/CallStack';

describe('portal detour HTTP responses', () => {
    it.each([
        { name: 'plain text', body: Buffer.from('Hello, portal!') },
        { name: 'text that is also valid base64', body: Buffer.from('test') },
        { name: 'UTF-8', body: Buffer.from('Grüße 👋') },
        { name: 'binary', body: Buffer.from([0, 128, 255, 13, 10]) },
    ])(
        'returns the original response bytes for $name',
        async ({ body }) => {
            const puth = new Puth({
                staticDir: false,
                cors: { enabled: false },
                logger: { info() {}, debug() {}, warn() {}, error() {} },
            });
            const abort = new AbortController();
            let detour: Promise<Response> | undefined;
            try {
                const server = puth.serve(0, '127.0.0.1');
                await server.ready();
                const base = server.url!;
                let context!: Context;
                puth.on('context:created', event => { context = event.context; });
                await puth.contextCreate({ portal: true, detour: true });

                const stack = new CallStack(context, {} as any);
                const call = new Call({ function: 'click' }, Promise.withResolvers(), {});
                stack.activeCall = call;

                // Substitute only Chrome's transport: send its rewritten request
                // over HTTP to the real Puth detour endpoint.
                const cdp = {
                    async send(method: string, params: any) {
                        expect(method).toBe('Fetch.continueRequest');
                        detour = fetch(params.url, {
                            method: 'POST',
                            headers: Object.fromEntries(params.headers.map(({ name, value }) => [name, value])),
                            body: 'upload body',
                            signal: abort.signal,
                        });
                        // The error case leaves the detour waiting for a reply.
                        void detour.catch(() => {});
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

                const forwarded = await call.response.promise as any;
                expect(forwarded.type).toBe('ServerRequest');
                expect(Buffer.from(forwarded.value.request.data, 'base64').toString()).toBe('upload body');
                stack.portal.waiting.response = Return.Self().serialize();

                const reply = await fetch(new URL('portal/response', base), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        context: { id: context.id },
                        response: {
                            psuri: forwarded.value.request.psuri,
                            type: 'PortalResponse',
                            status: 200,
                            headers: { 'Content-Type': 'text/plain' },
                            body: Buffer.from(body).toString('base64'),
                        },
                    }),
                    signal: abort.signal,
                });
                const replyBody = await reply.text();
                expect(reply.status, replyBody).toBe(200);
                const response = await detour!;
                expect(response.status).toBe(200);
                expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(body));
            } finally {
                abort.abort();
                await puth.destroy();
            }
        },
    );

    it('preserves response bytes for direct CDP fulfillment', async () => {
        const context = new Context({ logger: { debug() {} } } as any, { detour: false });
        const stack = new CallStack(context, {} as any);
        stack.activeCall = new Call({ function: 'click' }, Promise.withResolvers(), {});
        const commands: [string, any][] = [];
        const cdp = { async send(method: string, params: any) { commands.push([method, params]); } };
        await stack.onPortalRequest({
            requestId: 'fetch-direct',
            request: { url: 'http://example.test/', method: 'GET', headers: {} },
        } as any, '/', cdp as any);
        stack.portal.waiting.response = Return.Self().serialize();
        const body = Buffer.from([0, 128, 255, 13, 10]);
        await stack.handlePortalResponse({
            psuri: stack.portal.queue.active[0].psuri,
            type: 'PortalResponse',
            status: 200,
            headers: {},
            body: body.toString('base64'),
        }, { resolve() {} });
        expect(commands).toEqual([['Fetch.fulfillRequest', {
            requestId: 'fetch-direct',
            responseCode: 200,
            responseHeaders: [],
            body: body.toString('base64'),
        }]]);
    });
});
