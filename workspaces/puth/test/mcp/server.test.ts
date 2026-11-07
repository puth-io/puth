import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '@msgpack/msgpack';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Context, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureAltUrl, fixtureUrl, makePuthServer } from '../helper';
import { LiveViewSnapshotPlugin } from '../../src/plugins/LiveViewPlugin';
import { PUTH_EXTENSION_CODEC } from '../../src/handlers/WebsocketHandler';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../mcp/src/cli.ts');

const cleanups: (() => unknown)[] = [];
let directory: string;

beforeEach(() => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'puth-mcp-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
});

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

async function startInstance(port = 0) {
    const instance = makePuthServer(port, '127.0.0.1');
    instance.use(LiveViewSnapshotPlugin);
    await instance.http.ready();
    let destroyed = false;
    const destroy = () => {
        if (! destroyed) {
            destroyed = true;
            return instance.destroy();
        }
    };
    cleanups.push(destroy);

    return { instance, destroy, url: instance.http.url.replace(/\/$/, '') };
}

async function connect(instanceUrl: string, environment: Record<string, string> = {}) {
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: ['--import', 'tsx', cli],
        stderr: 'pipe',
        env: {
            PATH: process.env.PATH!,
            PUTH_INSTANCE_URL: instanceUrl,
            PUTH_APP_URL: fixtureUrl().replace(/\/$/, ''),
            PUTH_ARTIFACT_DIR: directory,
            ...environment,
        },
    });
    const client = new Client({ name: 'test', version: '1.0.0' });
    const protocolErrors: Error[] = [];
    client.onerror = (error) => protocolErrors.push(error);

    await client.connect(transport);

    let closed = false;
    const close = () => {
        if (! closed) {
            closed = true;
            return client.close();
        }
    };
    cleanups.push(close);

    const tool = async (name: string, args: Record<string, unknown> = {}) => {
        const result: any = await client.callTool({ name, arguments: args });

        return { ...result, data: result.structuredContent };
    };
    const session = async (args: Record<string, unknown> = {}) =>
        (await tool('puth_session_create', { url: fixtureUrl(), ...args })).data.sessionId as string;

    return { client, tool, session, close, protocolErrors };
}

describe('MCP protocol', () => {
    it('advertises its tools and nothing that runs arbitrary code', async () => {
        const { url } = await startInstance();
        const { client } = await connect(url);

        const { tools } = await client.listTools();

        assert.sameMembers(tools.map(({ name }) => name), [
            'puth_action', 'puth_assert', 'puth_events', 'puth_export', 'puth_inspect', 'puth_navigate', 'puth_pages',
            'puth_screenshot', 'puth_session_close', 'puth_session_create', 'puth_status', 'puth_wait',
        ]);
        assert.notInclude(JSON.stringify(tools), 'evaluate');
    }, 20000);

    it('keeps stdout to the protocol', async () => {
        const { url } = await startInstance();
        const { tool, session, protocolErrors } = await connect(url);

        const sessionId = await session();
        await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'not there', timeout: 100 } });
        await tool('puth_status');

        assert.deepEqual(protocolErrors, []);
    }, 20000);

    it('closes owned contexts on shutdown', async () => {
        const { instance, url } = await startInstance();
        const { session, close } = await connect(url);
        await session();
        assert.lengthOf(instance.diagnostics().contexts, 1);

        await close();

        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });
    }, 20000);

    it('rejects invalid input', async () => {
        const { url } = await startInstance();
        const { tool, session } = await connect(url);
        const sessionId = await session();

        const unknown = await tool('puth_action', { sessionId, action: { operation: 'evaluate', script: '1' } });
        const incomplete = await tool('puth_assert', { sessionId, assertion: { operation: 'seeIn', selector: 'body' } });

        assert.isTrue(unknown.isError);
        assert.isTrue(incomplete.isError);
    }, 20000);
});

describe('puth_status', () => {
    it('reports the instance and the addresses in use', async () => {
        const { instance, url } = await startInstance();
        const { tool, session } = await connect(url);
        const sessionId = await session();

        const { data } = await tool('puth_status');

        assert.strictEqual(data.endpoint, url);
        assert.strictEqual(data.instanceId, instance.health().instanceId);
        assert.strictEqual(data.appUrl, fixtureUrl().replace(/\/$/, ''));
        assert.include(data.appUrlNote, 'browser');
        assert.deepEqual(data.sessions.map(({ id }) => id), [sessionId]);
    }, 20000);

    it('explains how to start an unavailable instance without starting one', async () => {
        const { tool } = await connect('http://127.0.0.1:9');

        const { isError, data } = await tool('puth_status');

        assert.isTrue(isError);
        assert.strictEqual(data.error.code, 'INSTANCE_UNAVAILABLE');
        assert.include(data.error.message, 'docker compose up');
        assert.isFalse(data.connected);
    }, 20000);
});

describe('Sessions', () => {
    it('are isolated in their own contexts', async () => {
        const { instance, url } = await startInstance();
        const { tool, session } = await connect(url);

        const first = await session();
        const second = await session();
        await tool('puth_navigate', { sessionId: first, url: fixtureAltUrl() });

        assert.lengthOf(instance.diagnostics().contexts, 2);
        assert.isFalse((await tool('puth_assert', { sessionId: first, assertion: { operation: 'see', text: 'Alternate origin' } })).isError ?? false);
        assert.isTrue((await tool('puth_assert', { sessionId: second, assertion: { operation: 'see', text: 'Alternate origin', timeout: 100 } })).isError);
    }, 20000);

    it('can be closed repeatedly', async () => {
        const { tool, session } = { ...await connect((await startInstance()).url) };
        const sessionId = await session();

        assert.isFalse((await tool('puth_session_close', { sessionId })).data.alreadyClosed);
        assert.isTrue((await tool('puth_session_close', { sessionId })).data.alreadyClosed);

        const { data } = await tool('puth_inspect', { sessionId });
        assert.strictEqual(data.error.code, 'SESSION_CLOSED');
    }, 20000);

    it('refuse contexts of test runners', async () => {
        const { instance, url } = await startInstance();
        const { tool } = await connect(url);
        const runner = await Context.create(new RemotePuthClient(url));
        const { id } = runner.getRepresentation();

        for (const name of ['puth_inspect', 'puth_session_close']) {
            const { data, isError } = await tool(name, { sessionId: id });

            assert.isTrue(isError);
            assert.strictEqual(data.error.code, 'SESSION_NOT_FOUND');
        }

        assert.lengthOf(instance.diagnostics().contexts, 1);
        await runner.destroy({ immediately: true });
    }, 20000);

    it('run operations of one session one at a time and sessions next to each other', async () => {
        const { url } = await startInstance();
        const { tool, session } = await connect(url);
        const [first, second] = [await session(), await session()];
        const wait = (sessionId: string) => tool('puth_wait', { sessionId, wait: { operation: 'waitForText', text: 'never', timeout: 800 } });
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
        const { instance, url } = await startInstance();
        const { tool, session } = await connect(url, { PUTH_MCP_IDLE_TIMEOUT: '500' });
        const sessionId = await session();

        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });

        assert.strictEqual((await tool('puth_inspect', { sessionId })).data.error.code, 'SESSION_CLOSED');
    }, 20000);

    it('are invalidated when an operation can not finish in time', async () => {
        const { instance, url } = await startInstance();
        const { tool, session } = await connect(url, { PUTH_MCP_OPERATION_TIMEOUT: '1500' });
        const sessionId = await session();

        const { data } = await tool('puth_wait', { sessionId, wait: { operation: 'waitForVisible', selector: '#never', timeout: 5000 } });

        assert.strictEqual(data.error.code, 'OPERATION_TIMEOUT');
        assert.strictEqual((await tool('puth_inspect', { sessionId })).data.error.code, 'SESSION_CLOSED');
        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });
    }, 20000);

    it('report a stopped and a restarted instance', async () => {
        const { url, destroy } = await startInstance();
        const { tool, session } = await connect(url);
        const sessionId = await session();

        await destroy();
        assert.strictEqual((await tool('puth_inspect', { sessionId })).data.error.code, 'INSTANCE_UNAVAILABLE');

        await startInstance(Number(new URL(url).port));
        assert.strictEqual((await tool('puth_inspect', { sessionId })).data.error.code, 'SESSION_LOST');
    }, 25000);
});

describe('Browser tools', () => {
    it('navigate relative to the application', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session({ url: undefined });

        const { data } = await tool('puth_navigate', { sessionId, url: '/first?page=1' });

        assert.strictEqual(data.url, fixtureUrl('/first?page=1'));
    }, 20000);

    it('inspect the page with ranked selector candidates and bounded output', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { data } = await tool('puth_inspect', { sessionId, maxText: 100, maxElements: 5 });

        assert.strictEqual(data.title, 'Playground | Puth');
        assert.isAtMost(data.text.length, 100);
        assert.isTrue(data.textTruncated);
        assert.lengthOf(data.elements, 5);
        assert.isAbove(data.totalElements, 5);
        assert.isTrue(data.elements.every(({ selectors }) => selectors.every(({ stability }) => ['stable', 'medium', 'weak'].includes(stability))));
    }, 20000);

    it('act, wait and assert', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const typed = await tool('puth_action', { sessionId, action: { operation: 'type', selector: '#actions-type input', text: 'hello' } });
        const value = await tool('puth_assert', { sessionId, assertion: { operation: 'value', selector: '#actions-type input', value: 'hello' } });
        const waited = await tool('puth_wait', { sessionId, wait: { operation: 'waitForVisible', selector: '#actions-focus' } });

        for (const result of [typed, value, waited]) {
            assert.notOk(result.isError);
            assert.strictEqual(result.data.outcome, 'passed');
            assert.strictEqual(result.data.title, 'Playground | Puth');
        }
    }, 20000);

    it('report a failed assertion as an error with what was found', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { isError, data } = await tool('puth_assert', { sessionId, assertion: { operation: 'title', title: 'Wrong', timeout: 100 } });

        assert.isTrue(isError);
        assert.strictEqual(data.outcome, 'failed');
        assert.strictEqual(data.error.code, 'ASSERTION_FAILED');
        assert.include(data.error.message, 'Playground | Puth');
        assert.strictEqual(data.url, fixtureUrl());
    }, 20000);

    it('report why an action failed', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { data } = await tool('puth_action', { sessionId, action: { operation: 'click', selector: '#never', timeout: 100 } });

        assert.strictEqual(data.error.code, 'ACTION_FAILED');
    }, 20000);

    it('answer dialogs', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const opened = await tool('puth_action', { sessionId, action: { operation: 'click', selector: '#dialog-confirm' } });
        assert.isTrue(opened.data.warnings.some((warning) => warning.includes('A dialog is open')));

        const blocked = await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'anything' } });
        assert.strictEqual(blocked.data.error.code, 'DIALOG_OPEN');

        const answered = await tool('puth_action', { sessionId, action: { operation: 'dialog', response: 'accept' } });
        assert.notOk(answered.isError);
        assert.notOk((await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'Puth' } })).isError);
    }, 20000);

    it('select pages', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();
        await tool('puth_action', { sessionId, action: { operation: 'click', selector: `a[href="${fixtureAltUrl()}"]` } });

        await vi.waitFor(async () => assert.lengthOf((await tool('puth_pages', { sessionId })).data.pages, 2), { timeout: 3000 });
        const { data } = await tool('puth_pages', { sessionId, select: 1 });

        assert.strictEqual(data.selected, 1);
        assert.notOk((await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'Alternate origin' } })).isError);
    }, 20000);

    it('return a screenshot as an image and an artifact', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { content, data } = await tool('puth_screenshot', { sessionId });

        assert.strictEqual(content[0].type, 'image');
        assert.strictEqual(content[0].mimeType, 'image/png');
        assert.isTrue(existsSync(data.artifact));
        assert.include(data.artifact, path.join(directory, sessionId));
        assert.deepEqual([...readFileSync(data.artifact).subarray(1, 4)], [...Buffer.from('PNG')]);
    }, 20000);

    it('page through events of their own session only', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session({ url: fixtureUrl('/plain.txt') });
        const other = await session();
        const script = `<script>console.log('one'); console.log('two'); console.log('three'); console.error('bad')</script>`;
        await tool('puth_navigate', { sessionId, url: `data:text/html,${encodeURIComponent(script)}` });

        await vi.waitFor(async () => assert.strictEqual((await tool('puth_events', { sessionId, type: 'console' })).data.total, 3));

        const first = await tool('puth_events', { sessionId, type: 'console', limit: 2 });
        const second = await tool('puth_events', { sessionId, type: 'console', limit: 2, cursor: first.data.nextCursor });
        const errors = await tool('puth_events', { sessionId, type: 'errors' });
        const network = await tool('puth_events', { sessionId: other, type: 'network' });

        assert.deepEqual(first.data.events.map(({ text }) => text), ['one', 'two']);
        assert.deepEqual(second.data.events.map(({ text }) => text), ['three']);
        assert.isNull(second.data.nextCursor);
        assert.isTrue(errors.data.events.some(({ text }) => text === 'bad'));
        assert.isTrue(network.data.events.some(({ url, status }) => url === fixtureUrl() && status === 200));
    }, 20000);
});

describe('puth_export', () => {
    it('saves a snapshot the GUI can read', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { data } = await tool('puth_export', { sessionId, format: 'snapshot' });

        const packets = decode(readFileSync(data.artifact), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        assert.strictEqual(packets[0].type, 'context');
        assert.strictEqual(data.bytes, readFileSync(data.artifact).byteLength);
    }, 20000);

    it('saves a snapshot of a failure that the GUI shows', async () => {
        const { url } = await startInstance();
        const { tool, session } = await connect(url);
        const sessionId = await session({ name: 'failed in mcp' });
        await tool('puth_assert', { sessionId, assertion: { operation: 'visible', selector: '#never', timeout: 100 } });
        const { data } = await tool('puth_export', { sessionId, format: 'snapshot' });

        const context = await Context.create(new RemotePuthClient(url));
        const gui = await context.createBrowserShim();
        await gui.visit(url);
        const input = await gui.firstOrFail('input[type=file]');
        await input.uploadFile(data.artifact);

        await gui.waitForText('failed in mcp');
        await gui.assertSeeIn('[data-messagetype="error"]', 'Waited 100ms for selector');
        await context.destroy({ immediately: true });
    }, 20000);

    it('returns the journal', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();
        await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'Puth' } });
        await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'not there', timeout: 100 } });

        const { data } = await tool('puth_export', { sessionId, format: 'steps' });

        assert.deepEqual(data.steps.map(({ kind, outcome }) => [kind, outcome]), [
            ['navigate', 'passed'],
            ['assertion', 'passed'],
            ['assertion', 'failed'],
        ]);
    }, 20000);

    it('drafts tests from passed steps, or the selected ones', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();
        await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'Puth' } });
        await tool('puth_assert', { sessionId, assertion: { operation: 'see', text: 'not there', timeout: 100 } });
        await tool('puth_inspect', { sessionId });

        const all = (await tool('puth_export', { sessionId, format: 'laravel', name: 'Playground loads' })).data;
        const selected = (await tool('puth_export', { sessionId, format: 'php', steps: [0] })).data;

        assert.strictEqual(all.status, 'unverified');
        assert.strictEqual(all.className, 'PlaygroundLoadsTest');
        assert.include(all.code, "assertSee('Puth')");
        assert.notInclude(all.code, 'not there');
        assert.notInclude(selected.code, 'assertSee');
        assert.isTrue(selected.unresolved.some((item) => item.includes('No assertion')));
    }, 20000);

    it('rejects unknown journal steps', async () => {
        const { tool, session } = await connect((await startInstance()).url);
        const sessionId = await session();

        const { data } = await tool('puth_export', { sessionId, format: 'php', steps: [42] });

        assert.strictEqual(data.error.code, 'INVALID_REQUEST');
    }, 20000);
});

describe('Next to a test runner', () => {
    it('shares the instance without disturbing the context of the runner', async () => {
        const { instance, url } = await startInstance();
        const { tool, session } = await connect(url);
        const runner = await Context.create(new RemotePuthClient(url), { snapshot: true });
        const browser = await runner.createBrowserShim();
        await browser.visit(fixtureUrl());

        const sessionId = await session();
        const health = await (await fetch(`${url}/health`)).json();
        const status = (await tool('puth_status')).data;
        assert.strictEqual(status.instanceId, health.instanceId);

        const contexts = instance.diagnostics().contexts.map(({ id }) => id);
        assert.lengthOf(new Set(contexts), 2);

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
