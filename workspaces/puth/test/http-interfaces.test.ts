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
        assert.strictEqual(await browser.title(), 'Puth fixture');
        await context.destroy({ immediately: true });
    });

    it('answers with a structured error for unknown contexts', async () => {
        const response = await fetch(url('context/never-existed/snapshot'));

        assert.strictEqual(response.status, 404);
        expect(await response.json()).toMatchObject({ type: 'error', code: 'ContextNotFound' });
    });

    it('keeps the recording of finished contexts available', async () => {
        const context = await Context.create(client, { snapshot: true, test: { name: 'finished test' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await context.testFailed();
        const { id } = context.getRepresentation();
        await context.destroy({ immediately: true });

        const contexts = await (await fetch(url('contexts'))).json();
        const snapshot = await fetch(url(`context/${id}/snapshot`));

        expect(contexts.find((item) => item.id === id)).toMatchObject({ name: 'finished test', status: 'failed', active: false });
        assert.strictEqual(snapshot.status, 200);
    });

    it('records why a request failed', async () => {
        const context = await Context.create(client, { track: ['network'] });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await browser.evaluate(`fetch('http://127.0.0.1:9/gone').catch(() => {})`);

        await vi.waitFor(async () => {
            const updates = await context.getSnapshotsByType('update');
            expect(updates.find((update) => update.url.endsWith('/gone'))).toMatchObject({ errorText: 'net::ERR_UNSAFE_PORT' });
        });
        await context.destroy({ immediately: true });
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

    it('records the pages a test went through for the GUI', async () => {
        const context = await Context.create(client, { snapshot: true });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
        await browser.evaluate(`history.pushState({}, '', '/within')`);
        await browser.setContent('<title>Cart</title><h1>Cart</h1>');
        await browser.setContent('<title>Receipt</title><h1>Paid</h1>');

        await vi.waitFor(async () => {
            const pages = (await context.getSnapshotsByType('navigation'))
                .filter(({ url }) => url.startsWith('http'))
                .map(({ url }) => new URL(url).pathname);
            assert.includeMembers(pages, ['/', '/within']);
        });
        // setContent keeps the address, so its title tells the pages apart.
        const contents = (await context.getSnapshotsByType('navigation')).filter(({ initiator }) => initiator === 'setContent');
        assert.deepEqual(contents.map(({ title }) => title), ['Cart', 'Receipt']);
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
