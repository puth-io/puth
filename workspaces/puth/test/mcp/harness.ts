/**
 * What the MCP suites share: a Puth instance and a puth-mcp server per test, cleaned up after it. Importing it
 * registers the hooks that clean up.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach } from 'vitest';
import { fixtureUrl, makePuthServer } from '../helper';
import { LiveViewSnapshotPlugin } from '../../src/plugins/LiveViewPlugin';
import { HttpTransport, McpClient, StdioTransport } from './client';

export const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../mcp/src/cli.ts');

// The files in http/ run the suites again over HTTP. Read once, because they set it only while importing a suite.
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

export const cleanups: (() => unknown)[] = [];
export let directory: string;

beforeEach(() => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'puth-mcp-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
});

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

export async function startInstance(port = 0) {
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

export async function connect(instanceUrl: string, environment: Record<string, string> = {}) {
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
export const served = (body: string) => fixtureUrl(`/html?body=${encodeURIComponent(body)}`);
export const clickPage = `<title>Clicks</title><button id="go" onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button><p id="verify"></p>`;
// More than one outline window of elements, of several kinds.
export const longPage = `<title>Long</title><h1>Long page</h1>${Array.from({ length: 12 }, (_, index) => `<h2>Part ${index}</h2><button>Button ${index}</button><a href="#part-${index}">Link ${index}</a>`).join('')}`;

export const start = async (environment = {}) => ({ ...await startInstance().then(async (started) => ({ ...started, ...await connect(started.url, environment) })) });
