import { H3, type H3Event } from 'h3';
import { type Config } from './config';
import { DEFAULT_HTTP_PROTOCOL_VERSION, errorBody, INVALID_REQUEST, PARSE_ERROR, SUPPORTED_PROTOCOL_VERSIONS } from './protocol';
import { createServer } from './server';

const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
});

/**
 * Streamable HTTP without server-initiated messages: every request is answered with JSON, and there are no MCP sessions,
 * because browser sessions have ids of their own.
 */
export function createMcpApp(config: Config) {
    const { server, sessions } = createServer(config);
    const app = new H3();

    // A website must not reach a local server through DNS rebinding, so only listed origins may call it.
    const originAllowed = (event: H3Event) => {
        const origin = event.req.headers.get('origin');
        if (origin === null) {
            return true;
        }
        if (config.http.allowedOrigins.includes(origin)) {
            return true;
        }

        try {
            return LOOPBACK.includes(new URL(origin).hostname);
        } catch {
            return false;
        }
    };

    app.post('/mcp', async (event) => {
        if (! originAllowed(event)) {
            return json(errorBody(INVALID_REQUEST, 'Origin not allowed'), 403);
        }

        const version = event.req.headers.get('mcp-protocol-version');
        if (version !== null && ! SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
            return json(errorBody(INVALID_REQUEST, `Unsupported protocol version: ${version}`), 400);
        }

        const response = await server.receive(await event.req.text(), { protocolVersion: version ?? DEFAULT_HTTP_PROTOCOL_VERSION });
        if (response === undefined) {
            return new Response(null, { status: 202 });
        }

        const rejected = ! Array.isArray(response) && 'error' in response && response.id === null
            && [PARSE_ERROR, INVALID_REQUEST].includes(response.error.code);

        return json(response, rejected ? 400 : 200);
    });

    // There is no stream to open and no MCP session to end.
    for (const method of ['GET', 'DELETE'] as const) {
        app.on(method, '/mcp', () => new Response(null, { status: 405, headers: { allow: 'POST' } }));
    }

    return { app, server, sessions };
}
