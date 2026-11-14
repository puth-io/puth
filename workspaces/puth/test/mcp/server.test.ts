import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '@msgpack/msgpack';
import { Context, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, it, vi } from 'vitest';
import { fixtureAltUrl, fixtureUrl, makePuthServer } from '../helper';
import { LiveViewSnapshotPlugin } from '../../src/plugins/LiveViewPlugin';
import { PUTH_EXTENSION_CODEC } from '../../src/handlers/WebsocketHandler';
import { HttpTransport, McpClient, StdioTransport } from './client';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../mcp/src/cli.ts');

// server-http.test.ts runs these tests again over HTTP.
const TRANSPORT = process.env.PUTH_MCP_TEST_TRANSPORT ?? 'stdio';

/**
 * Starts puth-mcp --http on a free port. Stopping it plays the part of an MCP client that stops its stdio server.
 */
async function startHttpServer(env: Record<string, string>) {
    const child = spawn(process.execPath, ['--import', 'tsx', cli, '--http'], {
        env: { ...env, PUTH_MCP_PORT: '0' },
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let output = '';
    const url = await new Promise<string>((resolve, reject) => {
        child.stderr!.on('data', (chunk) => {
            output += chunk;
            const match = output.match(/listening at (\S+\/mcp)/);
            if (match) {
                resolve(match[1]);
            }
        });
        child.once('exit', () => reject(new Error(`puth-mcp --http exited: ${output}`)));
    });
    const stop = async () => {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await once(child, 'exit');
        }
    };

    return { url: new URL(url), stop };
}

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
    const env = {
        PATH: process.env.PATH!,
        PUTH_INSTANCE_URL: instanceUrl,
        PUTH_APP_URL: fixtureUrl().replace(/\/$/, ''),
        PUTH_ARTIFACT_DIR: directory,
        ...environment,
    };
    const http = TRANSPORT === 'http' ? await startHttpServer(env) : undefined;
    const transport = http === undefined
        ? new StdioTransport({ command: process.execPath, args: ['--import', 'tsx', cli], env })
        : new HttpTransport(http.url);
    const client = new McpClient(transport);
    const protocolErrors = client.errors;

    await client.connect();

    let closed = false;
    const close = async () => {
        if (! closed) {
            closed = true;
            await client.close();
            await http?.stop();
        }
    };
    cleanups.push(close);

    const tool = async (name: string, args: Record<string, unknown> = {}) => {
        const result: any = await client.callTool(name, args);

        return { ...result, text: result.content.find(({ type }) => type === 'text')?.text ?? '' };
    };
    const session = async (args: Record<string, unknown> = {}) => {
        const { text } = await tool('puth_session_create', { url: fixtureUrl(), ...args });

        return text.match(/^session (\w+)/)![1] as string;
    };
    const run = (sessionId: string, ...steps: Record<string, unknown>[]) => tool('puth_run', { sessionId, steps });

    return { client, tool, session, run, close, protocolErrors };
}

// Sessions open pages by URL, so a test's own HTML comes from the fixture origin.
const served = (body: string) => fixtureUrl(`/html?body=${encodeURIComponent(body)}`);
const clickPage = `<title>Clicks</title><button id="go" onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button><p id="verify"></p>`;
// More than one outline window of elements, of several kinds.
const longPage = `<title>Long</title><h1>Long page</h1>${Array.from({ length: 12 }, (_, index) => `<h2>Part ${index}</h2><button>Button ${index}</button><a href="#part-${index}">Link ${index}</a>`).join('')}`;

const start = async (environment = {}) => ({ ...await startInstance().then(async (started) => ({ ...started, ...await connect(started.url, environment) })) });

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
        const result = context.handoff(browser, { name: 'alt' });
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

describe('puth_run', () => {
    it('runs steps in one call and reports only what changed', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served('<title>Form</title><input id="name">') });

        const { text, isError } = await run(
            sessionId,
            { op: 'type', selector: '#name', text: 'hello' },
            { op: 'value', selector: '#name', value: 'hello' },
        );

        assert.notOk(isError);
        assert.match(text, /^ok 2/);
        assert.include(text, '=\\"hello\\"'.replace(/\\/g, ''));
        assert.notInclude(text, 'Form');
        assert.isBelow(text.split('\n').length, 5);
    }, 20000);

    it('reports text that appeared', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { text } = await run(sessionId, { op: 'click', selector: '#go' });

        assert.include(text, '+ "clicked button" in #verify');
    }, 20000);

    it('shows the start of a new page and how to read on', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: fixtureAltUrl() });

        const { text } = await run(sessionId, { op: 'visit', url: served(longPage) });

        assert.notInclude(text, '+ ');
        assert.match(text, /… \d+ more, puth_inspect cursor=15\nkinds: .*button/);
    }, 20000);

    it('checks exact text', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });
        await run(sessionId, { op: 'click', selector: '#go' });

        assert.notOk((await run(sessionId, { op: 'textIs', selector: '#verify', text: 'clicked button' })).isError);
        assert.match((await run(sessionId, { op: 'textIs', selector: '#verify', text: 'clicked', timeout: 100 })).text, /^ERR ASSERTION_FAILED: .*but found \[clicked button\]/);
    }, 20000);

    it('stops at the first failure and says where', async () => {
        const { session, run, tool } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { isError, text } = await run(
            sessionId,
            { op: 'title', text: 'Clicks' },
            { op: 'title', text: 'Wrong', timeout: 100 },
            { op: 'click', selector: '#go' },
        );

        assert.isTrue(isError);
        assert.match(text, /^ERR ASSERTION_FAILED: .*Clicks/);
        assert.include(text, 'at step 1 title, 1 passed');
        assert.lengthOf((await tool('puth_export', { sessionId, format: 'steps' })).text.split('\n'), 3);
    }, 20000);

    it('reports the new page after a navigation', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { text } = await run(sessionId, { op: 'visit', url: '/first?page=1' }, { op: 'visit', url: fixtureAltUrl() });

        assert.include(text, `at ${fixtureAltUrl()} "Puth fixture | Alternate origin"`);
    }, 20000);

    it('finds things by their visible text', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { isError } = await run(
            sessionId,
            { op: 'press', text: 'click me' },
            { op: 'seeIn', selector: '#verify', text: 'clicked button' },
            { op: 'visit', url: fixtureAltUrl() },
            { op: 'clickLink', text: 'Primary origin' },
            { op: 'title', text: 'Puth fixture' },
        );

        assert.notOk(isError);
    }, 20000);

    it('goes back, forward and reloads', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { isError } = await run(
            sessionId,
            { op: 'visit', url: fixtureAltUrl() },
            { op: 'back' },
            { op: 'title', text: 'Puth fixture' },
            { op: 'forward' },
            { op: 'reload' },
            { op: 'see', text: 'Alternate origin' },
        );

        assert.notOk(isError);
    }, 20000);

    it('evaluates scripts and returns their value', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { text } = await run(sessionId, { op: 'evaluate', script: `({ title: document.title, sum: 1 + 1 })` });

        assert.include(text, '= {"title":"Puth fixture","sum":2}');
    }, 20000);

    it('uploads files', async () => {
        const { session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'evaluate', script: `document.body.insertAdjacentHTML('beforeend', '<input id="file" type="file">')` });

        const { isError } = await run(
            sessionId,
            { op: 'upload', selector: '#file', file: cli },
            { op: 'evaluate', script: `document.querySelector('#file').files[0].name` },
        );

        assert.notOk(isError);
    }, 20000);

    it('explains why an action failed', async () => {
        const { session, run } = await start();

        const { text } = await run(await session(), { op: 'click', selector: '#never', timeout: 100 });

        assert.match(text, /^ERR ACTION_FAILED/);
    }, 20000);

    it('handles dialogs', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(`<button id="confirm" onclick="confirm('Sure?')">Delete</button>`) });

        const opened = await run(sessionId, { op: 'click', selector: '#confirm' });
        assert.include(opened.text, 'a dialog is open');

        assert.match((await run(sessionId, { op: 'see', text: 'anything' })).text, /^ERR DIALOG_OPEN/);
        assert.notOk((await run(sessionId, { op: 'dialog', response: 'accept' })).isError);
        assert.notOk((await run(sessionId, { op: 'see', text: 'Delete' })).isError);
    }, 20000);
});

describe('puth_inspect', () => {
    const page = `data:text/html,${encodeURIComponent(`
        <title>Form</title><h1>Sign in</h1><p role="alert">Wrong password</p>
        <form id="login">
            <label for="email">Email address</label><input id="email" name="email" type="email" required value="a@b.c">
            <label>Password <input name="password" type="password" value="hunter2"></label>
            <select name="plan"><option value="free">Free</option><option value="pro" selected>Pro</option></select>
            <button>Sign in</button>
        </form>
        <div hidden><button>Hidden</button></div>
    `)}`;

    it('outlines the page with labels, structure and values', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId });

        assert.include(text, '# Sign in');
        assert.include(text, '! Wrong password');
        assert.include(text, 'input:email "Email address" #email ="a@b.c" required');
        assert.include(text, 'input:password "Password" input[name="password"]');
        assert.include(text, 'select "" select[name="plan"] ="pro" of free|pro');
        const [, ...lines] = text.split('\n');
        assert.notInclude(lines.join('\n'), 'hunter2');
        assert.notInclude(lines.join('\n'), 'Hidden');
    }, 20000);

    it('can look at a part of the page', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, selector: '#login' });

        assert.notInclude(text, '# Sign in');
        assert.include(text, '#email');
    }, 20000);

    it('bounds its output and says how to continue', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: served(longPage) });

        const first = await tool('puth_inspect', { sessionId, limit: 5 });
        const next = Number(first.text.match(/cursor=(\d+)/)![1]);
        const second = await tool('puth_inspect', { sessionId, limit: 5, cursor: next });

        assert.lengthOf(first.text.split('\n'), 8);
        assert.match(first.text.split('\n').at(-1), /^kinds: \d+ heading, .*\d+ button.*, filter with kind=$/);
        assert.notStrictEqual(first.text, second.text);
    }, 20000);

    it('searches the outline and the visible text', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, find: 'wrong' });

        assert.deepEqual(text.split('\n').slice(1), ['! Wrong password']);
    }, 20000);

    it('says when a search found nothing', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, find: 'absent' });

        assert.deepEqual(text.split('\n').slice(1), ['no matches in the outline or visible text']);
    }, 20000);

    it('filters by kind', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const buttons = (await tool('puth_inspect', { sessionId, kind: 'button' })).text.split('\n').slice(1);
        const signIn = (await tool('puth_inspect', { sessionId, kind: 'heading', find: 'sign' })).text.split('\n').slice(1);

        assert.lengthOf(buttons, 1);
        assert.match(buttons[0], /^button "Sign in" ~#login>button/);
        assert.deepEqual(signIn, ['# Sign in']);
    }, 20000);

    it('says where text is, preferring a stable selector', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: `data:text/html,${encodeURIComponent('<div id="status"><span>Saved</span></div>')}` });

        assert.deepEqual((await tool('puth_inspect', { sessionId, kind: 'text' })).text.split('\n').slice(1), ['"Saved" in #status']);
    }, 20000);

    it('does not count kinds when nothing was cut off', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.notInclude((await tool('puth_inspect', { sessionId })).text, 'kinds:');
    }, 20000);

    it('searches the visible text', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.strictEqual((await tool('puth_inspect', { sessionId, text: true, find: 'WRONG' })).text, 'Wrong password');
        assert.strictEqual((await tool('puth_inspect', { sessionId, text: true, find: 'absent' })).text, 'no matches in the visible text');
    }, 20000);

    it('returns the visible text on request', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.include((await tool('puth_inspect', { sessionId, text: true })).text, 'Wrong password');
    }, 20000);

    it('reports an unknown part of the page', async () => {
        const { tool, session } = await start();

        assert.match((await tool('puth_inspect', { sessionId: await session(), selector: '#never' })).text, /^ERR INVALID_REQUEST/);
    }, 20000);
});

describe('Other browser tools', () => {
    it('select pages', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session({ url: served(`<a href="${fixtureAltUrl()}" target="_blank">Second origin</a>`) });
        await run(sessionId, { op: 'click', selector: 'a' });

        await vi.waitFor(async () => assert.lengthOf((await tool('puth_pages', { sessionId })).text.split('\n'), 2), { timeout: 3000 });
        const { text } = await tool('puth_pages', { sessionId, select: 1 });

        assert.include(text, '*1');
        assert.notOk((await run(sessionId, { op: 'see', text: 'Alternate origin' })).isError);
    }, 20000);

    it('return screenshots as images and artifacts', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: served('<h1>Screenshot</h1><p>A page with more than the input.</p><input id="name">') });

        const { content, text } = await tool('puth_screenshot', { sessionId });
        const element = await tool('puth_screenshot', { sessionId, selector: '#name' });

        assert.strictEqual(content[0].type, 'image');
        assert.strictEqual(content[0].mimeType, 'image/jpeg');
        assert.isTrue(existsSync(text));
        assert.include(text, path.join(directory, sessionId));
        assert.isBelow(element.content[0].data.length, content[0].data.length);
    }, 20000);

    it('page through events of their own session only', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session({ url: undefined });
        const other = await session();
        const script = `<script>console.log('one'); console.log('two'); console.log('three'); console.error('bad')</script>`;
        await run(sessionId, { op: 'visit', url: `data:text/html,${encodeURIComponent(script)}` });

        await vi.waitFor(async () => assert.lengthOf((await tool('puth_events', { sessionId, type: 'console' })).text.split('\n'), 3));

        const first = await tool('puth_events', { sessionId, type: 'console', limit: 2 });
        const errors = await tool('puth_events', { sessionId, type: 'errors' });
        const network = await tool('puth_events', { sessionId: other, type: 'network' });

        assert.deepEqual(first.text.split('\n'), ['log one', 'log two', '… 1 more, cursor=2']);
        assert.include(errors.text, 'error bad');
        assert.include(network.text, '200 GET / document');
        assert.notInclude(network.text, 'bootstrap');
    }, 20000);

    it('show failed requests', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'evaluate', script: `fetch('http://127.0.0.1:9/gone').catch(() => 'failed')` });

        await vi.waitFor(async () => assert.include((await tool('puth_events', { sessionId, type: 'network' })).text, 'FAILED GET /gone net::ERR'));
    }, 20000);
});

describe('Reading other contexts', () => {
    async function failedTest(url: string) {
        const context = await Context.create(new RemotePuthClient(url), {
            snapshot: true,
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

describe('puth_export', () => {
    it('saves a snapshot the GUI can read', async () => {
        const { tool, session } = await start();
        const sessionId = await session();

        const { text } = await tool('puth_export', { sessionId, format: 'snapshot' });

        const packets = decode(readFileSync(text), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
        assert.strictEqual(packets[0].type, 'context');
    }, 20000);

    it('marks tool calls, its own commands and drafts for the GUI', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'see', text: 'Puth' });
        await tool('puth_inspect', { sessionId, find: 'puth' });
        await tool('puth_export', { sessionId, format: 'laravel', name: 'Sees Puth' });

        const { text } = await tool('puth_export', { sessionId, format: 'snapshot' });
        const packets = decode(readFileSync(text), { extensionCodec: PUTH_EXTENSION_CODEC }) as any[];
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

describe('Next to a test runner', () => {
    it('shares the instance without disturbing the context of the runner', async () => {
        const { instance, url, tool, session } = await start();
        const runner = await Context.create(new RemotePuthClient(url), { snapshot: true });
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
