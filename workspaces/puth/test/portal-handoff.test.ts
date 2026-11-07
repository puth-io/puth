import { Browser, Context, RemoteContext, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureUrl, makePuthServer } from './helper';

describe('Handing a context to another client', () => {
    let instance;
    let client: RemotePuthClient;
    let context: Context;
    let browser: Browser;
    const served: string[] = [];

    const http = (path: string, method: string, body?: unknown, signal?: AbortSignal) => fetch(new URL(path, instance.http.url), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
    });

    const id = () => context.getRepresentation().id;

    /**
     * Acts like the PHP client: the call stays open, and each portal request it gets is answered by "the application".
     */
    async function runTest(options: Record<string, unknown> = {}, signal?: AbortSignal) {
        let response = await http('context/call', 'PATCH', {
            context: context.getRepresentation(),
            ...context.getRepresentation(),
            function: 'handoff',
            parameters: [browser.getRepresentation(), { name: 'dashboard', ...options }],
        }, signal);

        while (true) {
            const answer = await response.json();
            if (answer.type !== 'ServerRequest') {
                return answer;
            }

            const { psuri, url } = answer.value.request;
            served.push(url);
            response = await http('portal/response', 'PATCH', {
                context: context.getRepresentation(),
                response: {
                    psuri,
                    type: 'PortalResponse',
                    status: 200,
                    headers: { 'Content-Type': 'text/html' },
                    body: btoa('<h1>Served by the test</h1>'),
                },
            }, signal);
        }
    }

    const listed = async () => (await (await http('contexts', 'GET')).json()).find((item) => item.id === id());

    async function claim() {
        await vi.waitFor(async () => expect((await listed()).handoff).toMatchObject({ name: 'dashboard', state: 'waiting' }));

        const response = await http(`context/${id()}/handoff`, 'POST');
        const claimed = await response.json();
        const agentContext = new RemoteContext(client, claimed.context, {});

        return new Browser(agentContext, claimed.browser);
    }

    beforeEach(async () => {
        served.length = 0;
        instance = makePuthServer(0, '127.0.0.1');
        await instance.http.ready();
        client = new RemotePuthClient(instance.http.url.replace(/\/$/, ''));

        context = await Context.create(client, {
            portal: true,
            detour: false,
            supports: { portal: { urlPrefixes: [fixtureUrl('/through-portal')] } },
        });
        browser = await context.createBrowserShim();
    });

    afterEach(async () => {
        await context.destroy({ immediately: true }).catch(() => {});
        await instance.destroy();
    });

    it('serves requests of the agent from the blocked test', async () => {
        const test = runTest();
        const agent = await claim();

        await agent.visit(fixtureUrl('/through-portal/page'));
        await agent.assertSee('Served by the test');

        assert.include(served, fixtureUrl('/through-portal/page'));
        await http(`context/${id()}/handoff`, 'DELETE');

        expect(await test).toMatchObject({ value: 'released' });
    }, 20000);

    it('lets the test continue afterwards', async () => {
        const test = runTest();
        const agent = await claim();
        await agent.visit(fixtureUrl());

        await http(`context/${id()}/handoff`, 'DELETE');
        await test;

        assert.strictEqual(await browser.url(), fixtureUrl());
    }, 20000);

    it('can only be claimed once', async () => {
        const test = runTest();
        await claim();

        const second = await http(`context/${id()}/handoff`, 'POST');

        assert.strictEqual(second.status, 409);
        expect(await second.json()).toMatchObject({ code: 'HandoffUnavailable' });
        await http(`context/${id()}/handoff`, 'DELETE');
        await test;
    }, 20000);

    it('refuses contexts that did not offer a handoff', async () => {
        const response = await http(`context/${id()}/handoff`, 'POST');

        assert.strictEqual(response.status, 409);
    });

    it('ends after its timeout', async () => {
        expect(await runTest({ timeout: 200 })).toMatchObject({ value: 'timeout' });
    }, 10000);

    it('ends when the context is destroyed', async () => {
        const test = runTest();
        await vi.waitFor(async () => assert.isDefined((await listed()).handoff));

        await context.destroy({ immediately: true });

        expect(await test).toMatchObject({ value: 'context-destroyed' });
    }, 10000);

    it('ends when the test process disappears', async () => {
        const abort = new AbortController();
        void runTest({}, abort.signal).catch(() => {});
        await vi.waitFor(async () => assert.isDefined((await listed()).handoff));

        abort.abort();

        await vi.waitFor(async () => assert.isUndefined((await listed()).handoff));
    }, 10000);

    it('tells the test only after it answered the request it is handling', async () => {
        let release!: () => void;
        const answering = new Promise<void>((resolve) => { release = resolve; });

        const test = (async () => {
            let response = await http('context/call', 'PATCH', {
                context: context.getRepresentation(),
                ...context.getRepresentation(),
                function: 'handoff',
                parameters: [browser.getRepresentation(), { name: 'dashboard' }],
            });
            const answer = await response.json();
            await answering;
            response = await http('portal/response', 'PATCH', {
                context: context.getRepresentation(),
                response: { psuri: answer.value.request.psuri, type: 'PortalResponse', status: 200, headers: {}, body: '' },
            });

            return response.json();
        })();

        const agent = await claim();
        const visit = agent.visit(fixtureUrl('/through-portal/late')).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 200));

        await http(`context/${id()}/handoff`, 'DELETE');
        release();

        expect(await test).toMatchObject({ value: 'released' });
        await visit;
    }, 15000);
});
