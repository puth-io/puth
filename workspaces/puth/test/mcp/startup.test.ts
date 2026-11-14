import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Context, RemotePuthClient } from '@puth/client';
import { assert, describe, it, vi } from 'vitest';
import { fixtureAltUrl, fixtureUrl } from '../helper';
import { McpClient, StdioTransport } from './client';
import { cli, cleanups, directory, startInstance, connect, start } from './harness';

describe('MCP protocol', () => {
    it('advertises its tools', async () => {
        const { client } = await start();

        const { tools } = await client.listTools();

        assert.sameMembers(tools.map(({ name }) => name), [
            'puth_context', 'puth_contexts', 'puth_events', 'puth_export', 'puth_inspect', 'puth_pages', 'puth_run',
            'puth_screenshot', 'puth_session_close', 'puth_session_create', 'puth_status',
        ]);
    }, 20000);

    it('tells agents how to work with it', async () => {
        const { client } = await start();

        assert.include(client.instructions, 'handoff');
    }, 20000);

    it('keeps stdout to the protocol', async () => {
        const { tool, session, run, protocolErrors } = await start();

        const sessionId = await session();
        await run(sessionId, { op: 'see', text: 'not there', timeout: 100 });
        await tool('puth_status');

        assert.deepEqual(protocolErrors, []);
    }, 20000);

    it('closes owned contexts on shutdown', async () => {
        const { instance, session, close } = await start();
        await session();
        assert.lengthOf(instance.diagnostics().contexts, 1);

        await close();

        await vi.waitFor(() => assert.lengthOf(instance.diagnostics().contexts, 0), { timeout: 5000 });
    }, 20000);

    it('rejects steps with missing parameters using a stable code', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { isError, text } = await run(sessionId, { op: 'seeIn', selector: 'body' });

        assert.isTrue(isError);
        assert.match(text, /^ERR INVALID_REQUEST: seeIn needs text/);
    }, 20000);

    it('rejects unknown operations', async () => {
        const { session, run } = await start();

        assert.isTrue((await run(await session(), { op: 'unknown' })).isError);
    }, 20000);
});

describe('Project configuration', () => {
    const root = path.resolve(path.dirname(cli), '../../..');

    const claude = (environment: Record<string, string>) => {
        const { mcpServers } = JSON.parse(readFileSync(path.join(root, '.mcp.json'), 'utf8'));
        const expand = (value: string) =>
            value.replace(/\$\{(\w+):-([^}]*)\}/g, (_, name, fallback) => environment[name] ?? fallback);
        const { command, args, env } = mcpServers.puth;

        return {
            command,
            args: args.map(expand),
            env: { ...Object.fromEntries(Object.entries(env).map(([name, value]) => [name, expand(value as string)])) },
        };
    };

    const codex = (environment: Record<string, string>) => {
        const config = readFileSync(path.join(root, '.codex/config.toml'), 'utf8');
        const forwarded: string[] = JSON.parse(config.match(/^env_vars = (.+)$/m)![1]);

        return {
            command: config.match(/^command = "(.+)"$/m)![1],
            args: JSON.parse(config.match(/^args = (.+)$/m)![1]),
            env: Object.fromEntries(forwarded.filter((name) => name in environment).map((name) => [name, environment[name]])),
        };
    };

    it.each([['Claude Code', claude], ['Codex', codex]])('starts the server the way %s is configured to', async (_, read) => {
        const { url } = await startInstance();
        const { command, args, env } = read({ PUTH_INSTANCE_URL: url, PUTH_ARTIFACT_DIR: directory });

        const client = new McpClient(new StdioTransport({
            command,
            args,
            cwd: root,
            env: { PATH: process.env.PATH!, HOME: process.env.HOME ?? root, ...env },
        }));
        await client.connect();
        cleanups.push(() => client.close());

        const { content }: any = await client.callTool('puth_status');

        assert.include(content[0].text, `connected ${url}`);
        assert.include(content[0].text, 'app http://laravel:8080');
        assert.include(content[0].text, `artifacts ${directory}`);
    }, 20000);
});

describe('puth_status', () => {
    it('reports the instance and addresses in use', async () => {
        const { instance, url, tool, session } = await start();
        const sessionId = await session();

        const { text } = await tool('puth_status');

        assert.include(text, `connected ${url}`);
        assert.include(text, instance.health().instanceId.slice(0, 8));
        assert.include(text, `app ${fixtureUrl().replace(/\/$/, '')}`);
        assert.include(text, 'opened by the browser');
        assert.include(text, 'relative URLs resolve against it, not the current page');
        assert.include(text, `session ${sessionId}`);
    }, 20000);

    it('explains how to start an unavailable instance without starting one', async () => {
        const { tool } = await connect('http://127.0.0.1:9');

        const { isError, text } = await tool('puth_status');

        assert.isTrue(isError);
        assert.match(text, /^ERR INSTANCE_UNAVAILABLE: /);
        assert.include(text, 'Start it with: puth start');
    }, 20000);

    it('uses the start hint of the project', async () => {
        const { tool } = await connect('http://127.0.0.1:9', { PUTH_START_HINT: 'docker compose up --wait puth' });

        assert.include((await tool('puth_status')).text, 'Start it with: docker compose up --wait puth');
    }, 20000);
});

describe('Applications', () => {
    const main = fixtureUrl().replace(/\/$/, '');
    const alt = fixtureAltUrl().replace(/\/$/, '');
    const apps = { PUTH_APP_URL: '', PUTH_APP_URLS: `main=${main}, alt=${alt}` };
    const at = (text: string) => text.match(/^at (\S+)/m)?.[1];

    it('resolve relative URLs against the application of the session', async () => {
        const { tool, run } = await start(apps);

        const first = await tool('puth_session_create', { url: '/first' });
        const second = await tool('puth_session_create', { url: '/second', app: 'alt' });
        const secondId = second.text.match(/^session (\w+)/)![1];

        assert.strictEqual(at(first.text), `${main}/first`);
        assert.strictEqual(at(second.text), `${alt}/second`);
        assert.strictEqual(at((await run(secondId, { op: 'visit', url: '/third' })).text), `${alt}/third`);

        const { text } = await tool('puth_status');
        assert.include(text, `app main ${main} default (relative URLs resolve against the app of their session`);
        assert.include(text, `\napp alt ${alt}\n`);
        assert.include(text, `session ${secondId} alt 2 steps`);
        assert.strictEqual(text.match(/opened by the browser/g)?.length, 1);
    }, 20000);

    it('refuse an unknown name', async () => {
        const { instance, tool } = await start(apps);

        const { isError, text } = await tool('puth_session_create', { url: '/', app: 'shop' });

        assert.isTrue(isError);
        assert.strictEqual(text, 'ERR INVALID_REQUEST: There is no application [shop]. Known: main, alt.');
        assert.lengthOf(instance.diagnostics().contexts, 0);
    }, 20000);

    it('are found by the absolute URL a session starts on', async () => {
        const { session, run } = await start(apps);
        const sessionId = await session({ url: `${alt}/first` });

        assert.strictEqual(at((await run(sessionId, { op: 'visit', url: '/second' })).text), `${alt}/second`);
    }, 20000);

    it('are found by the page of a test that handed off', async () => {
        const { url, tool, run } = await start(apps);
        const context = await Context.create(new RemotePuthClient(url), { snapshot: true, test: { name: 'alt test' } });
        const browser = await context.createBrowserShim();
        await browser.visit(`${alt}/dashboard`);
        // Finishes like a test, otherwise closing the session waits for its result until a timeout.
        const result = context.handoff(browser, { name: 'alt' }).then(() => context.testSuccess());
        await vi.waitFor(async () => assert.include((await tool('puth_contexts')).text, 'handoff:waiting'));

        const { text } = await tool('puth_session_create', { handoff: context.getRepresentation().id });
        const sessionId = text.match(/^session (\w+)/)![1];

        assert.strictEqual(at((await run(sessionId, { op: 'visit', url: '/settings' })).text), `${alt}/settings`);
        await tool('puth_session_close', { sessionId });
        await result;
        await context.destroy({ immediately: true });
    }, 20000);

    it('give Laravel drafts of every application relative paths', async () => {
        const { tool, run } = await start(apps);

        for (const app of ['main', 'alt']) {
            const { text } = await tool('puth_session_create', { url: '/first', app });
            const sessionId = text.match(/^session (\w+)/)![1];
            await run(sessionId, { op: 'visit', url: '/second' });

            const draft = (await tool('puth_export', { sessionId, format: 'laravel' })).text;

            assert.include(draft, "visit('/first')");
            assert.include(draft, "visit('/second')");
            assert.notInclude(draft, 'http://');
            assert.notInclude(draft, 'leaves the application');
        }
    }, 30000);

    it('stop the server when an entry is invalid', () => {
        const result = spawnSync(process.execPath, ['--import', 'tsx', cli], {
            env: { PATH: process.env.PATH!, PUTH_APP_URLS: `main=${main} admin` },
            encoding: 'utf8',
            timeout: 15000,
        });

        assert.strictEqual(result.status, 1);
        assert.include(result.stderr, 'PUTH_APP_URLS: [admin] is not name=url');
    }, 20000);
});
