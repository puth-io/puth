// The tests of ../run.test.ts, with each server serving HTTP instead of stdio.
process.env.PUTH_MCP_TEST_TRANSPORT = 'http';
await import('../run.test');
delete process.env.PUTH_MCP_TEST_TRANSPORT;
