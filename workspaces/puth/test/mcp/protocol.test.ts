import { readFileSync } from 'node:fs';
import { assert, describe, it } from 'vitest';
import { readConfig } from '../../../mcp/src/config';
import { createMcpApp } from '../../../mcp/src/http';
import { LATEST_PROTOCOL_VERSION, McpProtocol } from '../../../mcp/src/protocol';
import { createServer } from '../../../mcp/src/server';

const config = readConfig({ PUTH_INSTANCE_URL: 'http://127.0.0.1:9', PUTH_APP_URL: 'http://app.test' });
const request = (method: string, params: unknown = {}, id: number = 1) => JSON.stringify({ jsonrpc: '2.0', id, method, params });

describe('MCP protocol', () => {
    const { server } = createServer(config);

    it('lists the schemas the MCP SDK listed', () => {
        // Recorded from @modelcontextprotocol/sdk 1.32.2. Update it on purpose when a tool changes.
        const recorded = JSON.parse(readFileSync(new URL('./tools.json', import.meta.url), 'utf8'));

        assert.deepEqual(server.listTools(), recorded);
    });

    it('answers with the requested protocol version, or its newest one', async () => {
        const initialize = async (protocolVersion: string) =>
            ((await server.receive(request('initialize', { protocolVersion, capabilities: {}, clientInfo: { name: 't', version: '1' } }))) as any).result;

        const result = await initialize('2025-06-18');
        assert.strictEqual(result.protocolVersion, '2025-06-18');
        assert.deepEqual(result.capabilities, { tools: {} });
        assert.strictEqual(result.serverInfo.name, 'puth');
        assert.notStrictEqual(result.serverInfo.version, '0.0.0');
        assert.include(result.instructions, 'puth_status');

        assert.strictEqual((await initialize('2099-01-01')).protocolVersion, LATEST_PROTOCOL_VERSION);
    });

    it('answers ping and ignores notifications', async () => {
        assert.deepEqual(await server.receive(request('ping')), { jsonrpc: '2.0', id: 1, result: {} });
        assert.isUndefined(await server.receive(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })));
        assert.isUndefined(await server.receive(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/unknown' })));
    });

    it('rejects unknown methods, invalid JSON and invalid requests', async () => {
        assert.deepEqual(await server.receive(request('resources/list')), {
            jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found: resources/list' },
        });
        assert.deepEqual(await server.receive('{"jsonrpc":'), { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        assert.deepEqual(await server.receive(JSON.stringify({ id: 3, method: 'ping' })), {
            jsonrpc: '2.0', id: 3, error: { code: -32600, message: 'Invalid request' },
        });
    });

    it('rejects unknown tools as a protocol error and invalid arguments as a tool error', async () => {
        assert.deepEqual(await server.receive(request('tools/call', { name: 'nope', arguments: {} })), {
            jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Tool nope not found' },
        });

        const { result }: any = await server.receive(request('tools/call', { name: 'puth_run', arguments: { sessionId: 1 } }));
        assert.isTrue(result.isError);
        assert.match(result.content[0].text, /^Invalid arguments for tool puth_run: .* at sessionId/);
    });

    it('answers batches only in protocol versions that have them', async () => {
        const batch = `[${request('ping', {}, 1)},${request('ping', {}, 2)}]`;

        assert.deepEqual(await server.receive(batch, { protocolVersion: '2025-03-26' }), [
            { jsonrpc: '2.0', id: 1, result: {} },
            { jsonrpc: '2.0', id: 2, result: {} },
        ]);
        assert.strictEqual(((await server.receive(batch, { protocolVersion: '2025-06-18' })) as any).error.code, -32600);
    });

    it('remembers the negotiated version of a connection', async () => {
        const peer = {};
        await server.receive(request('initialize', { protocolVersion: '2025-03-26' }), peer);

        assert.deepEqual(peer, { protocolVersion: '2025-03-26' });
        assert.strictEqual(McpProtocol.negotiate(undefined), LATEST_PROTOCOL_VERSION);
    });
});

describe('MCP over HTTP', () => {
    const { app } = createMcpApp(config);
    const post = (body: string, headers: Record<string, string> = {}) => app.fetch(new Request('http://127.0.0.1:7346/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
        body,
    }));

    it('answers requests with JSON and notifications with 202', async () => {
        const response = await post(request('ping'));

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.get('content-type'), 'application/json');
        assert.deepEqual(await response.json(), { jsonrpc: '2.0', id: 1, result: {} });

        const notification = await post(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
        assert.strictEqual(notification.status, 202);
        assert.strictEqual(await notification.text(), '');
    });

    it('accepts loopback and listed origins and rejects others', async () => {
        assert.strictEqual((await post(request('ping'), { origin: 'http://localhost:5173' })).status, 200);
        assert.strictEqual((await post(request('ping'), { origin: 'http://[::1]:3000' })).status, 200);
        assert.strictEqual((await post(request('ping'), { origin: 'https://evil.example' })).status, 403);

        const listed = createMcpApp(readConfig({ PUTH_MCP_ORIGINS: 'https://agent.example' })).app;
        const fromListed = await listed.fetch(new Request('http://127.0.0.1:7346/mcp', {
            method: 'POST', headers: { origin: 'https://agent.example' }, body: request('ping'),
        }));
        assert.strictEqual(fromListed.status, 200);
    });

    it('rejects unsupported protocol versions and invalid JSON', async () => {
        assert.strictEqual((await post(request('ping'), { 'mcp-protocol-version': '1999-01-01' })).status, 400);
        assert.strictEqual((await post('nope')).status, 400);
    });

    it('opens no stream and has no session to end', async () => {
        for (const method of ['GET', 'DELETE']) {
            const response = await app.fetch(new Request('http://127.0.0.1:7346/mcp', { method }));

            assert.strictEqual(response.status, 405);
            assert.strictEqual(response.headers.get('allow'), 'POST');
        }
    });
});
