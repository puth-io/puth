// Drives a known workflow through the MCP server and writes the exported drafts into the real test suites, together
// with copies that contain a wrong assertion. docker/dev/test-mcp-drafts.sh runs them. See dev/TESTING.md.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { McpClient, StdioTransport } from '../../workspaces/puth/test/mcp/client';

const root = path.resolve(import.meta.dirname, '../..');
const fixtures = process.env.PUTH_FIXTURE_URL ?? 'http://127.0.0.1:8081';

const targets = {
    laravel: 'workspaces/clients/php/workspaces/laravel/tests/Browser',
    php: 'workspaces/clients/php/client/tests/Feature',
};

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

const created = await tool('puth_session_create', { name: 'Mcp draft', url: '/' });
const sessionId = created.match(/^session (\w+)/)![1];

await tool('puth_run', {
    sessionId,
    steps: [
        { op: 'title', text: 'laravel puth testbed' },
        { op: 'visit', url: `${fixtures}/actions.html` },
        { op: 'title', text: 'Actions | Puth' },
        { op: 'waitFor', selector: '#click' },
        { op: 'click', selector: '#click' },
        { op: 'seeIn', selector: '#clicked', text: 'clicked button' },
        { op: 'textIs', selector: '#clicked', text: 'clicked button' },
        { op: 'type', selector: '#name', text: "it's typed" },
        { op: 'value', selector: '#name', value: "it's typed" },
        { op: 'keys', selector: '#keys', keys: ['a', 'b'] },
        { op: 'select', selector: '#fruit', value: 'orange' },
        { op: 'value', selector: '#fruit', value: 'orange' },
    ],
});

for (const [format, directory] of Object.entries(targets)) {
    const className = 'McpDraftTest';
    const code = await tool('puth_export', { sessionId, format, name: 'Mcp draft' });
    if (! code.includes('UNVERIFIED')) {
        throw new Error('Exported drafts must be labeled as unverified.');
    }

    const broken = code
        .replace(className, 'McpBrokenDraftTest')
        .replace("assertTitle('Actions | Puth')", "assertTitle('Intentionally wrong')");
    if (broken.includes("assertTitle('Actions | Puth')")) {
        throw new Error('Could not break the draft.');
    }

    writeFileSync(path.join(root, directory, `${className}.php`), code);
    writeFileSync(path.join(root, directory, 'McpBrokenDraftTest.php'), broken);
    console.error(`Wrote ${format} drafts to ${directory}`);
}

await tool('puth_session_close', { sessionId });
await client.close();
