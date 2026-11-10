#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config';
import { createServer } from './server';

// stdout belongs to the MCP protocol, so everything else has to go to stderr.
console.log = console.error;

let config: ReturnType<typeof readConfig>;
try {
    config = readConfig();
} catch (error: any) {
    console.error(`puth-mcp: ${error.message}`);
    process.exit(1);
}
const { server, sessions } = createServer(config);

let closing = false;
async function shutdown() {
    if (closing) {
        return;
    }
    closing = true;

    await sessions.closeAll();
    await server.close();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('end', shutdown);

await server.connect(new StdioServerTransport());
console.error(`puth-mcp connected, using the Puth instance at ${config.instanceUrl}`);
