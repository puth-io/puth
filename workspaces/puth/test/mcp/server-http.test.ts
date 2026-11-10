// The MCP suite of server.test.ts, with each server serving HTTP instead of stdio.
process.env.PUTH_MCP_TEST_TRANSPORT = 'http';

await import('./server.test');
