import { z } from 'zod/v4';

/**
 * The part of the Model Context Protocol this server uses: initialization, ping and tools, over any transport.
 */

export const LATEST_PROTOCOL_VERSION = '2025-11-25';
export const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05'];
// Streamable HTTP without a version header means this one.
export const DEFAULT_HTTP_PROTOCOL_VERSION = '2025-03-26';
// JSON-RPC batches existed only in these versions.
const BATCH_VERSIONS = ['2025-03-26', '2024-11-05'];

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export type Content = { type: 'text', text: string } | { type: 'image', data: string, mimeType: string };
export type ToolResult = { content: Content[], isError?: boolean };

type Id = string | number | null;
type Message = { jsonrpc: '2.0', id?: Id, method?: string, params?: any };
export const errorBody = (code: number, message: string): Response => ({ jsonrpc: '2.0', id: null, error: { code, message } });

export type Response = { jsonrpc: '2.0', id: Id } & ({ result: unknown } | { error: { code: number, message: string } });

// What a transport knows about its client. Stdio has one connection, a stateless HTTP request only its headers.
export type Peer = { protocolVersion?: string };

type Tool = {
    description: string;
    schema: z.ZodObject<any>;
    handler: (input: any) => Promise<ToolResult>;
};

/**
 * Keeps the schemas agents saw from the MCP SDK: objects with properties allow no others, and integers have no bounds
 * of JavaScript numbers.
 */
const sdkCompatible = ({ jsonSchema }: { jsonSchema: Record<string, any> }) => {
    if (jsonSchema.type === 'object' && jsonSchema.additionalProperties === undefined && Object.keys(jsonSchema.properties ?? {}).length > 0) {
        jsonSchema.additionalProperties = false;
    }
    if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) {
        delete jsonSchema.maximum;
    }
    if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) {
        delete jsonSchema.minimum;
    }
};

const errorResponse =(id: Id, code: number, message: string): Response => ({ jsonrpc: '2.0', id, error: { code, message } });

class ProtocolError extends Error {
    constructor(readonly code: number, message: string) {
        super(message);
    }
}

export class McpProtocol {
    private readonly tools = new Map<string, Tool>();

    constructor(
        private readonly serverInfo: { name: string, version: string },
        private readonly instructions: string,
    ) {}

    registerTool<Shape extends z.ZodRawShape>(
        name: string,
        { description, inputSchema }: { description: string, inputSchema: Shape },
        handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<ToolResult>,
    ) {
        this.tools.set(name, { description, schema: z.object(inputSchema), handler });
    }

    listTools() {
        return [...this.tools].map(([name, { description, schema }]) => ({
            name,
            description,
            inputSchema: z.toJSONSchema(schema, { target: 'draft-7', io: 'input', override: sdkCompatible }),
        }));
    }

    /**
     * Answers one serialized message, or a batch where the protocol version has them. Notifications get no answer.
     */
    async receive(text: string, peer: Peer = {}): Promise<Response | Response[] | undefined> {
        let message: unknown;
        try {
            message = JSON.parse(text);
        } catch {
            return errorResponse(null, PARSE_ERROR, 'Parse error');
        }

        if (Array.isArray(message)) {
            if (peer.protocolVersion === undefined || ! BATCH_VERSIONS.includes(peer.protocolVersion) || message.length === 0) {
                return errorResponse(null, INVALID_REQUEST, 'Batches are not supported in this protocol version');
            }
            const responses = (await Promise.all(message.map(item => this.handle(item, peer)))).filter(response => response !== undefined);

            return responses.length === 0 ? undefined : responses;
        }

        return this.handle(message, peer);
    }

    async handle(message: unknown, peer: Peer = {}): Promise<Response | undefined> {
        if (! isMessage(message)) {
            return errorResponse(validId(message) ? (message as any).id : null, INVALID_REQUEST, 'Invalid request');
        }
        // Responses to requests this server never sends, and notifications, need no answer.
        if (message.method === undefined || message.id === undefined) {
            return undefined;
        }

        try {
            return { jsonrpc: '2.0', id: message.id, result: await this.request(message.method, message.params ?? {}, peer) };
        } catch (error: any) {
            return error instanceof ProtocolError
                ? errorResponse(message.id, error.code, error.message)
                : errorResponse(message.id, INTERNAL_ERROR, String(error?.message ?? error));
        }
    }

    /**
     * The version a client asked for, or the newest one if this server does not know it.
     */
    static negotiate(requested: unknown) {
        return typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
    }

    private async request(method: string, params: any, peer: Peer): Promise<unknown> {
        switch (method) {
            case 'initialize':
                peer.protocolVersion = McpProtocol.negotiate(params.protocolVersion);

                return {
                    protocolVersion: peer.protocolVersion,
                    capabilities: { tools: {} },
                    serverInfo: this.serverInfo,
                    instructions: this.instructions,
                };
            case 'ping':
                return {};
            case 'tools/list':
                return { tools: this.listTools() };
            case 'tools/call':
                return this.callTool(params);
            default:
                throw new ProtocolError(METHOD_NOT_FOUND, `Method not found: ${method}`);
        }
    }

    private async callTool({ name, arguments: input }: { name?: unknown, arguments?: unknown }): Promise<ToolResult> {
        const tool = typeof name === 'string' ? this.tools.get(name) : undefined;
        if (tool === undefined) {
            throw new ProtocolError(INVALID_PARAMS, `Tool ${String(name)} not found`);
        }

        const parsed = tool.schema.safeParse(input ?? {});
        if (! parsed.success) {
            const issues = parsed.error.issues.map(issue => `${issue.message}${issue.path.length ? ` at ${issue.path.join('.')}` : ''}`);

            return {
                content: [{ type: 'text', text: `Invalid arguments for tool ${name}: ${issues.join('\n')}` }],
                isError: true,
            };
        }

        return tool.handler(parsed.data);
    }
}

const validId = (message: unknown) => {
    const id = (message as any)?.id;

    return id === null || typeof id === 'string' || typeof id === 'number';
};

function isMessage(message: unknown): message is Message {
    if (typeof message !== 'object' || message === null || (message as any).jsonrpc !== '2.0') {
        return false;
    }
    const { id, method } = message as any;
    if (id !== undefined && ! validId(message)) {
        return false;
    }

    return method === undefined ? id !== undefined : typeof method === 'string';
}
