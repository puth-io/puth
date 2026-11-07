// Drives a known workflow through the MCP server and writes the exported drafts into the real test suites, together
// with copies that contain a wrong assertion. docker/dev/test-mcp-drafts.sh runs them. See dev/TESTING.md.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(import.meta.dirname, '../..');
const fixtures = process.env.PUTH_FIXTURE_URL ?? 'http://127.0.0.1:8081';

const targets = {
    laravel: 'workspaces/clients/php/workspaces/laravel/tests/Browser',
    php: 'workspaces/clients/php/client/tests/Feature',
};

const client = new Client({ name: 'export-drafts', version: '1.0.0' });
await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', path.join(root, 'workspaces/mcp/src/cli.ts')],
    env: { ...process.env } as Record<string, string>,
    stderr: 'inherit',
}));

async function tool(name: string, args: Record<string, unknown>) {
    const result: any = await client.callTool({ name, arguments: args });
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
        { op: 'visit', url: `${fixtures}/` },
        { op: 'title', text: 'Playground | Puth' },
        { op: 'waitFor', selector: '#actions-click-button' },
        { op: 'click', selector: '#actions-click-button' },
        { op: 'seeIn', selector: '#actions-click-verify', text: 'clicked button' },
        { op: 'type', selector: '#actions-focus', text: "it's typed" },
        { op: 'value', selector: '#actions-focus', value: "it's typed" },
        { op: 'keys', selector: '#actions-clear', keys: ['a', 'b'] },
        { op: 'select', selector: '#actions-select', value: 'orange' },
        { op: 'value', selector: '#actions-select', value: 'orange' },
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
        .replace("assertTitle('Playground | Puth')", "assertTitle('Intentionally wrong')");
    if (broken.includes("assertTitle('Playground | Puth')")) {
        throw new Error('Could not break the draft.');
    }

    writeFileSync(path.join(root, directory, `${className}.php`), code);
    writeFileSync(path.join(root, directory, 'McpBrokenDraftTest.php'), broken);
    console.error(`Wrote ${format} drafts to ${directory}`);
}

await tool('puth_session_close', { sessionId });
await client.close();
