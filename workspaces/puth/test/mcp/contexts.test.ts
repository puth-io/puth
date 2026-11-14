import { zstdDecompressSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { decode } from '@msgpack/msgpack';
import { Context, RemotePuthClient } from '@puth/client';
import { assert, describe, it, vi } from 'vitest';
import { fixtureUrl } from '../helper';
import { PUTH_EXTENSION_CODEC } from '../../src/handlers/WebsocketHandler';
import { start } from './harness';

describe('Reading other contexts', () => {
    async function failedTest(url: string) {
        const context = await Context.create(new RemotePuthClient(url), {
            snapshot: true,
            frames: true,
            test: { name: 'checkout fails', group: 'Tests\\Browser\\CheckoutFlowTest' },
        });
        const browser = await context.createBrowserShim();
        await browser.setTimeout(100);
        await browser.visit(fixtureUrl());
        await browser.evaluate(`console.error('payment widget broke')`);
        await browser.click('#pay').catch(() => {});
        await context.testFailed();

        return context;
    }

    it('lists them newest first and without agent sessions', async () => {
        const { url, tool, session } = await start();
        await session({ name: 'mine' });
        const context = await failedTest(url);
        await context.destroy({ immediately: true });

        const { text } = await tool('puth_contexts');

        assert.include(text, 'failed "checkout fails"');
        assert.notInclude(text, 'mine');
    }, 20000);

    it('filters them', async () => {
        const { url, tool } = await start();
        const context = await failedTest(url);

        assert.include((await tool('puth_contexts', { query: 'CHECKOUT' })).text, 'checkout fails');
        assert.include((await tool('puth_contexts', { query: 'checkout_fails' })).text, 'checkout fails');
        assert.include((await tool('puth_contexts', { query: 'CheckoutFlowTest' })).text, '"checkout fails" CheckoutFlowTest');
        assert.strictEqual((await tool('puth_contexts', { status: 'successful' })).text, 'none');
        await context.destroy({ immediately: true });
    }, 20000);

    it('explains why a finished test failed', async () => {
        const { url, tool } = await start();
        const context = await failedTest(url);
        const { id } = context.getRepresentation();
        await context.destroy({ immediately: true });

        const { text } = await tool('puth_context', { id: id.slice(0, 8) });

        assert.include(text, 'failed "checkout fails"');
        assert.include(text, 'click(#pay');
        assert.include(text, '✗ Waited 100ms for selector');
        assert.include(text, 'error payment widget broke');
        assert.isBelow(text.indexOf('payment widget broke'), text.indexOf('click(#pay'), 'the error came first');
    }, 20000);

    it('lists commands, console and network', async () => {
        const { url, tool } = await start();
        const context = await failedTest(url);
        const id = context.getRepresentation().id;

        const commands = (await tool('puth_context', { id, view: 'commands' })).text;
        assert.include(commands, 'visit(');
        assert.notInclude(commands, 'createBrowserShim');
        assert.notInclude(commands, 'testFailed');
        assert.include((await tool('puth_context', { id, view: 'commands', all: true })).text, 'testFailed');
        assert.match(commands, /^1 setTimeout/, 'hidden commands keep their numbers');
        assert.include((await tool('puth_context', { id, view: 'console' })).text, 'payment widget broke');
        await context.destroy({ immediately: true });
    }, 20000);

    it('shows one command with its full arguments', async () => {
        const { url, tool } = await start();
        const context = await failedTest(url);
        const id = context.getRepresentation().id;
        const long = `<p>${'x'.repeat(200)}</p><script>window.answer = 42</script>`;
        const browser = await context.createBrowserShim();
        await browser.setContent(long);

        const commands = (await tool('puth_context', { id, view: 'commands' })).text.split('\n');
        const index = commands.find((line) => line.includes('setContent'))!.split(' ')[0];
        const { text } = await tool('puth_context', { id, command: Number(index) });

        assert.include(text, 'window.answer = 42');
        assert.match((await tool('puth_context', { id, command: 999 })).text, /^ERR INVALID_REQUEST/);
        await context.destroy({ immediately: true });
    }, 20000);

    it('explains about:blank after setContent', async () => {
        const { url, tool } = await start();
        const context = await Context.create(new RemotePuthClient(url), { snapshot: true, test: { name: 'set directly' } });
        const browser = await context.createBrowserShim();
        await browser.setContent('<h1>Checkout</h1>');
        await browser.evaluate(`document.body.append('changed')`);

        await vi.waitFor(async () => {
            const { text } = await tool('puth_context', { id: context.getRepresentation().id });
            assert.include(text, 'last url about:blank (content was set with setContent, not loaded)');
        }, { timeout: 3000 });
        await context.destroy({ immediately: true });
    }, 20000);

    it('shows the page at a command', async () => {
        const { url, tool } = await start();
        const context = await failedTest(url);

        await vi.waitFor(async () => {
            const { content } = await tool('puth_context', { id: context.getRepresentation().id, frame: -1 });
            assert.strictEqual(content[0].type, 'image');
        }, { timeout: 3000 });
        await context.destroy({ immediately: true });
    }, 20000);

    it('reads snapshot files', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session({ name: 'exported' });
        await run(sessionId, { op: 'visible', selector: '#never', timeout: 100 });
        const file = (await tool('puth_export', { sessionId, format: 'snapshot' })).text;

        const { text } = await tool('puth_context', { file });

        assert.include(text, '"exported"');
        assert.include(text, '✗ Waited 100ms');
    }, 20000);

    it('reports unknown contexts and files', async () => {
        const { tool } = await start();

        assert.match((await tool('puth_context', { id: 'nope' })).text, /^ERR CONTEXT_NOT_FOUND/);
        assert.match((await tool('puth_context', { file: '/nope.puth' })).text, /^ERR CONTEXT_NOT_FOUND/);
        assert.match((await tool('puth_context', {})).text, /^ERR INVALID_REQUEST/);
    }, 20000);
});

describe('puth_export', () => {
    it('saves a snapshot the GUI can read', async () => {
        const { tool, session } = await start();
        const sessionId = await session();

        const { text } = await tool('puth_export', { sessionId, format: 'snapshot' });

        const packets = decode(zstdDecompressSync(readFileSync(text)), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        assert.strictEqual(packets[0].type, 'context');
    }, 20000);

    it('marks tool calls, its own commands and drafts for the GUI', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'see', text: 'Puth' });
        await tool('puth_inspect', { sessionId, find: 'puth' });
        await tool('puth_export', { sessionId, format: 'laravel', name: 'Sees Puth' });

        const { text } = await tool('puth_export', { sessionId, format: 'snapshot' });
        const packets = decode(zstdDecompressSync(readFileSync(text)), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        const annotations = packets.filter(({ type }) => type === 'annotation');

        assert.deepEqual(annotations.filter(({ kind }) => kind === 'tool').map(({ tool }) => tool), [
            'puth_session_create', 'puth_run', 'puth_inspect',
        ]);
        assert.strictEqual(annotations.find(({ tool }) => tool === 'puth_run').summary, 'see');
        const draft = annotations.find(({ kind }) => kind === 'draft');
        assert.strictEqual(draft.name, 'Sees Puth');
        assert.include(draft.code, "assertSee('Puth')");

        // Every outline read of the server is enclosed in a quiet pair.
        const quiet = annotations.filter(({ kind }) => kind === 'quiet').map(({ quiet }) => quiet);
        assert.isAbove(quiet.length, 0);
        assert.deepEqual(quiet, quiet.map((_, index) => index % 2 === 0));
    }, 20000);

    it('saves a snapshot of a failure that the GUI shows', async () => {
        const { url, tool, session, run } = await start();
        const sessionId = await session({ name: 'failed in mcp' });
        await run(sessionId, { op: 'visible', selector: '#never', timeout: 100 });
        const file = (await tool('puth_export', { sessionId, format: 'snapshot' })).text;

        const context = await Context.create(new RemotePuthClient(url));
        const gui = await context.createBrowserShim();
        await gui.visit(url);
        const input = await gui.firstOrFail('input[type=file]');
        await input.uploadFile(file);

        await gui.waitForText('failed in mcp');
        await gui.assertSeeIn('[data-messagetype="error"]', 'Waited 100ms for selector');
        await context.destroy({ immediately: true });
    }, 20000);

    it('lists the journal', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'see', text: 'Puth' });
        await run(sessionId, { op: 'see', text: 'not there', timeout: 100 });

        const lines = (await tool('puth_export', { sessionId, format: 'steps' })).text.split('\n');

        assert.match(lines[0], /^0 visit /);
        assert.match(lines[1], /^1 see /);
        assert.match(lines[2], /^2 ✗ see /);
    }, 20000);

    it('drafts tests from passed steps, or the selected ones', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'see', text: 'Puth' });
        await run(sessionId, { op: 'see', text: 'not there', timeout: 100 });
        await tool('puth_inspect', { sessionId });

        const all = (await tool('puth_export', { sessionId, format: 'laravel', name: 'Playground loads' })).text;
        const selected = (await tool('puth_export', { sessionId, format: 'php', steps: [0] })).text;

        assert.include(all, 'UNVERIFIED');
        assert.include(all, 'class PlaygroundLoadsTest');
        assert.include(all, "assertSee('Puth')");
        assert.notInclude(all, 'not there');
        assert.notInclude(selected, '->assertSee');
        assert.include(selected, 'No assertion');
    }, 20000);

    it('rejects unknown steps', async () => {
        const { tool, session } = await start();

        assert.match((await tool('puth_export', { sessionId: await session(), format: 'php', steps: [42] })).text, /^ERR INVALID_REQUEST/);
    }, 20000);
});
