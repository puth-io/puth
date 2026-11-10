#!/usr/bin/env node
import { serve } from 'h3';
import { readConfig } from './config';
import { createMcpApp } from './http';
import { createServer } from './server';
import { serveStdio } from './stdio';

// stdout belongs to the MCP protocol over stdio, so everything else has to go to stderr.
console.log = console.error;

let config: ReturnType<typeof readConfig>;
try {
    config = readConfig();
} catch (error: any) {
    console.error(`puth-mcp: ${error.message}`);
    process.exit(1);
}

const http = process.argv.includes('--http');
let closeTransport = async () => {};
let sessions: ReturnType<typeof createServer>['sessions'];

let closing = false;
async function shutdown() {
    if (closing) {
        return;
    }
    closing = true;

    await sessions.closeAll();
    await closeTransport();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (http) {
    const mcp = createMcpApp(config);
    sessions = mcp.sessions;

    const server = serve(mcp.app, { hostname: config.http.host, port: config.http.port, silent: true });
    await server.ready();
    closeTransport = () => server.close(true);

    console.error(`puth-mcp listening at ${server.url!.replace(/\/$/, '')}/mcp, using the Puth instance at ${config.instanceUrl}`);
} else {
    const mcp = createServer(config);
    sessions = mcp.sessions;

    void serveStdio(mcp.server).then(shutdown);
    console.error(`puth-mcp connected, using the Puth instance at ${config.instanceUrl}`);
}
