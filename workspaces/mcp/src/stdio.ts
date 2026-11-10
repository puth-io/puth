import { createInterface } from 'node:readline';
import { type McpProtocol, type Peer } from './protocol';

/**
 * Newline-delimited JSON-RPC on stdin and stdout. Requests run concurrently, each answer is written when it is ready.
 */
export function serveStdio(protocol: McpProtocol, input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
    const peer: Peer = {};
    const lines = createInterface({ input, crlfDelay: Infinity });

    lines.on('line', (line) => {
        if (line.trim() === '') {
            return;
        }

        void protocol.receive(line, peer).then((response) => {
            if (response !== undefined) {
                output.write(`${JSON.stringify(response)}\n`);
            }
        });
    });

    return new Promise<void>(resolve => lines.once('close', resolve));
}
