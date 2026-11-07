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
        throw new Error(`${name} failed: ${JSON.stringify(result.structuredContent)}`);
    }

    return result.structuredContent;
}

const { sessionId } = await tool('puth_session_create', { name: 'Mcp draft', url: '/' });
const assertion = (step: Record<string, unknown>) => tool('puth_assert', { sessionId, assertion: step });
const action = (step: Record<string, unknown>) => tool('puth_action', { sessionId, action: step });

await assertion({ operation: 'title', title: 'laravel puth testbed' });

await tool('puth_navigate', { sessionId, url: `${fixtures}/` });
await assertion({ operation: 'title', title: 'Playground | Puth' });
await tool('puth_wait', { sessionId, wait: { operation: 'waitForVisible', selector: '#actions-click-button' } });
await action({ operation: 'click', selector: '#actions-click-button' });
await assertion({ operation: 'seeIn', selector: '#actions-click-verify', text: 'clicked button' });
await action({ operation: 'type', selector: '#actions-focus', text: "it's typed" });
await assertion({ operation: 'value', selector: '#actions-focus', value: "it's typed" });
await action({ operation: 'keypress', selector: '#actions-clear', keys: ['a', 'b'] });
await action({ operation: 'select', selector: '#actions-select', value: 'orange' });
await assertion({ operation: 'value', selector: '#actions-select', value: 'orange' });

for (const [format, directory] of Object.entries(targets)) {
    const { code, className, status } = await tool('puth_export', { sessionId, format, name: 'Mcp draft' });
    if (status !== 'unverified') {
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
