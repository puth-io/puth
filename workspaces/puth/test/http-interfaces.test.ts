import { decode } from '@msgpack/msgpack';
import { Context, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureAltUrl, fixtureUrl, makePuthServer } from './helper';
import { PUTH_EXTENSION_CODEC } from '../src/handlers/WebsocketHandler';

describe('HTTP interfaces', () => {
    let instance;
    let client: RemotePuthClient;
    const url = (path: string) => new URL(path, instance.http.url);

    beforeEach(async () => {
        instance = makePuthServer(0, '127.0.0.1');
        await instance.http.ready();
        client = new RemotePuthClient(instance.http.url.replace(/\/$/, ''));
    });

    afterEach(() => instance.destroy());

    it('reports its health', async () => {
        const first = await (await fetch(url('health'))).json();
        const second = await (await fetch(url('health'))).json();

        assert.match(first.version, /^\d+\.\d+\.\d+/);
        assert.include(first.capabilities, 'context-snapshot');
        assert.isNotEmpty(first.instanceId);
        assert.strictEqual(first.instanceId, second.instanceId);
    });

    it('exports a snapshot without destroying the context', async () => {
        const context = await Context.create(client, { snapshot: true });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());

        const { id } = context.getRepresentation();
        const response = await fetch(url(`context/${id}/snapshot`));
        const packets = decode(await response.arrayBuffer(), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];

        assert.strictEqual(response.status, 200);
        assert.strictEqual(packets[0].type, 'context');
        assert.strictEqual(await browser.title(), 'Playground | Puth');
        await context.destroy({ immediately: true });
    });

    it('answers with a structured error for unknown and destroyed contexts', async () => {
        const context = await Context.create(client);
        const { id } = context.getRepresentation();
        await context.destroy({ immediately: true });

        for (const unknown of [id, 'never-existed']) {
            const response = await fetch(url(`context/${unknown}/snapshot`));

            assert.strictEqual(response.status, 404);
            expect(await response.json()).toMatchObject({ type: 'error', code: 'ContextNotFound' });
        }
    });

    it('rejects calls on a destroyed context with that error', async () => {
        const context = await Context.create(client);
        const browser = await context.createBrowserShim();
        await context.destroy({ immediately: true });

        await expect(browser.title()).rejects.toThrow(/^ContextNotFound: /);
    });

    it('lists and selects open pages', async () => {
        const context = await Context.create(client);
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await browser.setContent(`<a id="open" href="${fixtureAltUrl()}" target="_blank">open</a>`);
        await browser.click('#open');

        await vi.waitFor(async () => assert.lengthOf(await browser.openPages(), 2));
        const popup = await browser.onPage(1);

        await popup.assertSee('Alternate origin');
        await expect(browser.onPage(5)).rejects.toThrow('no open page with index [5]');
        await context.destroy({ immediately: true });
    });

    it('tracks network summaries and page errors on request', async () => {
        const context = await Context.create(client, { track: ['network'] });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await browser.evaluate(`setTimeout(() => { throw new Error('page broke') })`);

        await vi.waitFor(async () => {
            const logs = await context.getSnapshotsByType('log');
            assert.isTrue(logs.some((log) => log.messageType === 'error' && log.text.includes('page broke')));
        });

        const responses = await context.getSnapshotsByType('response');
        assert.isNotEmpty(responses);
        assert.strictEqual(responses[0].status, 200);
        assert.isUndefined(responses[0].content);
        await context.destroy({ immediately: true });
    });

    it('does not track network activity by default', async () => {
        const context = await Context.create(client);
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());

        assert.deepEqual(await context.getSnapshotsByType('response'), []);
        await context.destroy({ immediately: true });
    });
});
