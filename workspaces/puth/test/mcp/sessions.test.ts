import { once } from 'node:events';
import { Context, RemotePuthClient } from '@puth/client';
import { assert, describe, it, vi } from 'vitest';
import { fixtureAltUrl, fixtureUrl } from '../helper';
import { startInstance, connect, start } from './harness';

describe('Sessions', () => {
    it('are isolated in their own contexts', async () => {
        const { instance, session, run } = await start();
        const first = await session();
        const second = await session();

        await run(first, { op: 'visit', url: fixtureAltUrl() });

        assert.lengthOf(instance.diagnostics().contexts, 2);
        assert.notOk((await run(first, { op: 'see', text: 'Alternate origin' })).isError);
        assert.isTrue((await run(second, { op: 'see', text: 'Alternate origin', timeout: 100 })).isError);
    }, 20000);

    it('can be closed repeatedly', async () => {
        const { tool, session } = await start();
        const sessionId = await session();

        assert.strictEqual((await tool('puth_session_close', { sessionId })).text, 'closed');
        assert.strictEqual((await tool('puth_session_close', { sessionId })).text, 'closed already');
        assert.match((await tool('puth_inspect', { sessionId })).text, /^ERR SESSION_CLOSED/);
    }, 20000);

    it('refuse contexts of test runners that did not offer a handoff', async () => {
        const { instance, url, tool } = await start();
        const runner = await Context.create(new RemotePuthClient(url));
        const { id } = runner.getRepresentation();

        assert.match((await tool('puth_inspect', { sessionId: id })).text, /^ERR SESSION_NOT_FOUND/);
        assert.match((await tool('puth_session_close', { sessionId: id })).text, /^ERR SESSION_NOT_FOUND/);
        assert.match((await tool('puth_session_create', { handoff: id })).text, /^ERR HANDOFF_UNAVAILABLE/);

        assert.lengthOf(instance.diagnostics().contexts, 1);
        await runner.destroy({ immediately: true });
    }, 20000);

    it('run operations of one session one at a time and sessions next to each other', async () => {
        const { session, run } = await start();
        const [first, second] = [await session(), await session()];
        const wait = (sessionId: string) => run(sessionId, { op: 'waitText', text: 'never', timeout: 800 });
        const timed = async (work: Promise<unknown>) => {
            const startedAt = performance.now();
            await work;
            return performance.now() - startedAt;
        };

        const [together, other] = await Promise.all([
            timed(Promise.all([wait(first), wait(first)])),
            timed(wait(second)),
        ]);

        assert.isAtLeast(together, 1600);
        assert.isBelow(other, together);
    }, 20000);

    it('are closed after being idle', async () => {
        const { instance, tool, session } = await start({ PUTH_MCP_IDLE_TIMEOUT: '500' });
        const sessionId = await session();

        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });

        assert.match((await tool('puth_inspect', { sessionId })).text, /^ERR SESSION_CLOSED/);
    }, 20000);

    it('are invalidated when an operation can not finish in time', async () => {
        const { instance, tool, session, run } = await start({ PUTH_MCP_OPERATION_TIMEOUT: '1500' });
        const sessionId = await session();

        const { text } = await run(sessionId, { op: 'waitFor', selector: '#never', timeout: 5000 });

        assert.match(text, /^ERR OPERATION_TIMEOUT/);
        assert.match((await tool('puth_inspect', { sessionId })).text, /^ERR SESSION_CLOSED/);
        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });
    }, 20000);

    it('report a stopped and a restarted instance', async () => {
        const { url, destroy } = await startInstance();
        const { tool, session } = await connect(url);
        const sessionId = await session();

        await destroy();
        assert.match((await tool('puth_inspect', { sessionId })).text, /^ERR INSTANCE_UNAVAILABLE/);

        await startInstance(Number(new URL(url).port));
        assert.match((await tool('puth_inspect', { sessionId })).text, /^ERR SESSION_LOST/);
    }, 25000);
});

describe('Taking over a test', () => {
    async function waitingTest(url: string) {
        const context = await Context.create(new RemotePuthClient(url), { snapshot: true, test: { name: 'logged in test' } });
        const browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());

        // Like a test runner: the test passes once the handoff ends.
        const result = context.handoff(browser, { name: 'dashboard' }).then(async (reason) => {
            await context.testSuccess();
            return reason;
        });

        return { context, browser, result };
    }

    it('drives the browser of the test and hands it back', async () => {
        const { url, tool, run } = await start();
        const { context, browser, result } = await waitingTest(url);

        await vi.waitFor(async () => assert.include((await tool('puth_contexts')).text, 'handoff:waiting'));
        assert.include((await tool('puth_status')).text, 'handoff ');

        const id = context.getRepresentation().id.slice(0, 8);
        const { text } = await tool('puth_session_create', { handoff: id });
        const sessionId = text.match(/^session (\w+)/)![1];
        assert.include(text, 'took over "dashboard" from logged in test, its login and data apply');

        await run(sessionId, { op: 'visit', url: fixtureAltUrl() }, { op: 'see', text: 'Alternate origin' });

        const draft = (await tool('puth_export', { sessionId, format: 'laravel' })).text;
        assert.include(draft, "assertSee('Alternate origin')");
        assert.notInclude(draft, 'class ');
        assert.include(draft, 'go after handoff() in the test');

        const closed = await tool('puth_session_close', { sessionId });

        assert.strictEqual(await result, 'released');
        assert.match(closed.text, /^closed, the test finished:\nsuccessful "logged in test"/);
        assert.strictEqual(await browser.url(), fixtureAltUrl());

        // The GUI shows who drives the test from these.
        const handoffs = await context.getSnapshotsByType('handoff');
        assert.deepEqual(handoffs.map(({ state, name, reason }) => [state, name, reason ?? null]), [
            ['waiting', 'dashboard', null],
            ['claimed', 'dashboard', null],
            ['ended', 'dashboard', 'released'],
        ]);
        await context.destroy({ immediately: true });
    }, 20000);

    it('can not be taken twice', async () => {
        const { url, tool } = await start();
        const { context } = await waitingTest(url);
        const id = context.getRepresentation().id;
        await vi.waitFor(async () => assert.include((await tool('puth_contexts')).text, 'handoff:waiting'));

        await tool('puth_session_create', { handoff: id });

        assert.match((await tool('puth_session_create', { handoff: id })).text, /^ERR HANDOFF_UNAVAILABLE/);
    }, 20000);

    it('releases the test when the server shuts down', async () => {
        const { url, tool, close } = await start();
        const { context, result } = await waitingTest(url);
        await vi.waitFor(async () => assert.include((await tool('puth_contexts')).text, 'handoff:waiting'));
        await tool('puth_session_create', { handoff: context.getRepresentation().id });

        await close();

        assert.strictEqual(await result, 'released');
        await context.destroy({ immediately: true });
    }, 20000);
});

describe('Next to a test runner', () => {
    it('shares the instance without disturbing the context of the runner', async () => {
        const { instance, url, tool, session } = await start();
        const runner = await Context.create(new RemotePuthClient(url), { snapshot: true, frames: true });
        const browser = await runner.createBrowserShim();
        await browser.visit(fixtureUrl());

        const sessionId = await session();
        const health = await (await fetch(`${url}/health`)).json();
        assert.include((await tool('puth_status')).text, health.instanceId.slice(0, 8));
        assert.lengthOf(new Set(instance.diagnostics().contexts.map(({ id }) => id)), 2);

        const frames = async () => (await runner.getSnapshotsByType('screencasts')).length;
        const before = await frames();
        await tool('puth_session_close', { sessionId });

        await vi.waitFor(async () => {
            await browser.evaluate(`document.body.style.outline = '${Math.random() * 9 + 1}px solid red'`);
            assert.isAbove(await frames(), before);
        }, { timeout: 5000 });

        await browser.assertSee('Puth');
        await runner.destroy({ immediately: true });
    }, 30000);
});
