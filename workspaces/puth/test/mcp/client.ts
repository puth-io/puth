import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

/**
 * A minimal MCP client for the tests, so they need no MCP SDK. It speaks JSON-RPC over stdio or Streamable HTTP
 * the way MCP clients do, and checks every message it receives.
 */

// A version that clients in use send, not the newest one of the server, so negotiation is exercised.
const PROTOCOL_VERSION = '2025-06-18';

type Message = { jsonrpc: '2.0', id?: number, method?: string, params?: unknown, result?: any, error?: { code: number, message: string } };

export class McpError extends Error {
    constructor(readonly code: number, message: string) {
        super(`MCP error ${code}: ${message}`);
    }
}

interface Transport {
    send(message: Message): Promise<void>;
    close(): Promise<void>;
}

export class StdioTransport implements Transport {
    private child?: ChildProcess;

    constructor(private readonly options: {
        command: string,
        args: string[],
        env: Record<string, string>,
        cwd?: string,
        stderr?: 'pipe'|'inherit'|'ignore',
    }) {}

    start(receive: (line: string) => void) {
        this.child = spawn(this.options.command, this.options.args, {
            env: this.options.env,
            cwd: this.options.cwd,
            stdio: ['pipe', 'pipe', this.options.stderr ?? 'pipe'],
        });
        // Read stderr, so a chatty server cannot block on a full pipe.
        this.child.stderr?.resume();
        createInterface({ input: this.child.stdout! }).on('line', receive);
    }

    async send(message: Message) {
        this.child!.stdin!.write(JSON.stringify(message) + '\n');
    }

    async close() {
        const child = this.child;
        if (child === undefined || child.exitCode !== null || child.signalCode !== null) {
            return;
        }
        // Like MCP clients: close stdin first, then terminate a server that does not exit.
        const exited = once(child, 'exit');
        child.stdin!.end();
        const timeout = setTimeout(() => child.kill('SIGTERM'), 2000);
        await exited;
        clearTimeout(timeout);
    }
}

export class HttpTransport implements Transport {
    private protocolVersion?: string;

    constructor(private readonly url: URL) {}

    start(receive: (line: string) => void) {
        this.receive = receive;
    }

    private receive: (line: string) => void = () => {};

    setProtocolVersion(version: string) {
        this.protocolVersion = version;
    }

    async send(message: Message) {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json, text/event-stream',
                ...(this.protocolVersion ? { 'mcp-protocol-version': this.protocolVersion } : {}),
            },
            body: JSON.stringify(message),
        });

        if (message.id === undefined) {
            if (response.status !== 202) {
                throw new Error(`Expected 202 for a notification, got ${response.status}.`);
            }
            return;
        }
        if (! response.headers.get('content-type')?.startsWith('application/json')) {
            throw new Error(`Expected a JSON answer, got ${response.status} ${response.headers.get('content-type')}.`);
        }
        this.receive(await response.text());
    }

    async close() {}
}

export class McpClient {
    instructions?: string;
    protocolVersion?: string;
    readonly errors: Error[] = [];

    private nextId = 1;
    private pending = new Map<number, PromiseWithResolvers<any>>();

    constructor(private readonly transport: StdioTransport|HttpTransport) {}

    async connect() {
        this.transport.start((line) => this.receive(line));

        const result = await this.request('initialize', {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
        });
        if (typeof result?.protocolVersion !== 'string' || typeof result?.serverInfo?.name !== 'string') {
            throw new Error(`Invalid initialize result: ${JSON.stringify(result)}`);
        }
        this.protocolVersion = result.protocolVersion;
        this.instructions = result.instructions;
        if (this.transport instanceof HttpTransport) {
            this.transport.setProtocolVersion(result.protocolVersion);
        }

        await this.transport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    }

    async listTools(): Promise<{ tools: { name: string, inputSchema: object }[] }> {
        const result = await this.request('tools/list', {});
        if (! Array.isArray(result?.tools)) {
            throw new Error(`Invalid tools/list result: ${JSON.stringify(result)}`);
        }

        return result;
    }

    async callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: any[], isError?: boolean }> {
        const result = await this.request('tools/call', { name, arguments: args });
        if (! Array.isArray(result?.content)) {
            throw new Error(`Invalid tools/call result: ${JSON.stringify(result)}`);
        }

        return result;
    }

    async close() {
        await this.transport.close();
        for (const { reject } of this.pending.values()) {
            reject(new Error('Connection closed'));
        }
        this.pending.clear();
    }

    private request(method: string, params: unknown): Promise<any> {
        const id = this.nextId++;
        const response = Promise.withResolvers<any>();
        this.pending.set(id, response);
        this.transport.send({ jsonrpc: '2.0', id, method, params }).catch((error) => {
            this.pending.delete(id);
            response.reject(error);
        });

        return response.promise;
    }

    // Anything that is not a JSON-RPC answer to a pending request breaks the protocol.
    private receive(line: string) {
        let message: Message;
        try {
            message = JSON.parse(line);
        } catch {
            this.errors.push(new Error(`Not JSON: ${line}`));
            return;
        }

        const pending = typeof message?.id === 'number' ? this.pending.get(message.id) : undefined;
        if (message?.jsonrpc !== '2.0' || pending === undefined || ('result' in message) === ('error' in message)) {
            this.errors.push(new Error(`Unexpected message: ${line}`));
            return;
        }

        this.pending.delete(message.id!);
        if (message.error) {
            pending.reject(new McpError(message.error.code, message.error.message));
        } else {
            pending.resolve(message.result);
        }
    }
}
