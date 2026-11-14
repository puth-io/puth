// Acts like an agent: waits for the test written by docker/dev/test-mcp-handoff.sh, takes it over and uses the
// application through it.
import path from 'node:path';
import { McpClient, StdioTransport } from '../../workspaces/puth/test/mcp/client';

const root = path.resolve(import.meta.dirname, '../..');

const client = new McpClient(new StdioTransport({
    command: process.execPath,
    args: ['--import', 'tsx', path.join(root, 'workspaces/mcp/src/cli.ts')],
    env: { ...process.env } as Record<string, string>,
    stderr: 'inherit',
}));
await client.connect();

async function tool(name: string, args: Record<string, unknown>) {
    const result: any = await client.callTool(name, args);
    if (result.isError) {
        throw new Error(`${name} failed: ${result.content[0].text}`);
    }

    return result.content[0].text as string;
}

let id: string|undefined;
for (let attempt = 0; attempt < 120 && id === undefined; attempt++) {
    const listed = await tool('puth_contexts', { query: 'agent uses', limit: 1 });
    id = listed.match(/^(\w+) .*handoff:waiting/)?.[1];
    await new Promise(resolve => setTimeout(resolve, 500));
}
if (id === undefined) {
    throw new Error('The test did not offer a handoff.');
}

const created = await tool('puth_session_create', { handoff: id });
const sessionId = created.match(/^session (\w+)/)![1];

console.error(await tool('puth_run', { sessionId, steps: [{ op: 'visit', url: '/send/mail' }] }));

await tool('puth_session_close', { sessionId });
await client.close();
