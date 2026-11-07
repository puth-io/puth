import { readFile } from 'node:fs/promises';
import { decode, ExtensionCodec } from '@msgpack/msgpack';

const codec = new ExtensionCodec();
codec.register({ type: 0, encode: () => null, decode: (data: Uint8Array) => new TextDecoder().decode(data) });

export const decodeRecording = (data: Uint8Array) => decode(data, { extensionCodec: codec }) as any[];

export const readRecording = async (file: string) => decodeRecording(await readFile(file));

const shorten = (value: unknown, limit: number) => {
    const text = (typeof value === 'string' ? value : JSON.stringify(value) ?? '').replace(/\s+/g, ' ').trim();

    return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const errorOf = ({ errors }: any) => {
    const [error] = errors ?? [];

    return error === undefined ? undefined : shorten(error.error?.message ?? error.expectation?.message ?? 'failed', 300);
};

const pathOf = (url: string) => {
    try {
        const { pathname, search } = new URL(url);
        return pathname + search;
    } catch {
        return url;
    }
};

export type Recording = {
    name: string;
    status: string;
    commands: any[];
    logs: any[];
    responses: any[];
    failedRequests: any[];
    frames: any[];
};

export function parseRecording(packets: any[]): Recording {
    const byTime = (a: any, b: any) => (a.timestamp ?? a.time ?? 0) - (b.timestamp ?? b.time ?? 0);
    const ofType = (type: string) => packets.filter(packet => packet?.type === type).sort(byTime);
    const status = ofType('test').at(-1)?.status;

    return {
        name: packets[0]?.test?.name ?? '',
        status: status ?? packets[0]?.test?.status ?? 'pending',
        commands: ofType('command'),
        logs: ofType('log'),
        responses: ofType('response'),
        failedRequests: packets.filter(packet => packet?.specific === 'request.failed'),
        frames: ofType('screencasts'),
    };
}

export const commandLine = (command: any, index: number) => {
    const args = (command.args ?? []).map((arg: unknown) => shorten(arg, 60)).join(', ');
    const error = errorOf(command);

    return `${index} ${command.func}(${args})${error === undefined ? '' : `\n  ✗ ${error}`}`;
};

export const logLine = ({ messageType, text }: any) => `${messageType} ${shorten(text, 300)}`;

export const responseLine = ({ status, method, url, resourceType }: any) =>
    `${status} ${method} ${shorten(pathOf(url), 120)} ${resourceType ?? ''}`.trim();

export const failedRequestLine = ({ method, url, errorText }: any) =>
    `FAILED ${method ?? ''} ${shorten(pathOf(url), 120)} ${errorText ?? ''}`.replace(/\s+/g, ' ').trim();

const isError = ({ messageType }: any) => messageType === 'error';

export function summarize(recording: Recording): string[] {
    const { name, status, commands, logs, responses, failedRequests, frames } = recording;
    const failedCommands = commands.flatMap((command, index) => errorOf(command) === undefined ? [] : [commandLine(command, index)]);
    const errors = logs.filter(isError);
    const badResponses = responses.filter(response => response.status >= 400);
    const last = frames.at(-1)?.page?.url;

    return [
        `${status} "${name}" ${commands.length} commands, ${errors.length} console errors, ${frames.length} frames`,
        ...(last === undefined ? [] : [`last url ${last}`]),
        ...failedCommands.slice(-3),
        ...(failedCommands.length === 0 ? commands.slice(-3).map((command, index) => commandLine(command, commands.length - 3 + index)) : []),
        ...errors.slice(-3).map(logLine),
        ...failedRequests.slice(-3).map(failedRequestLine),
        ...badResponses.slice(-3).map(responseLine),
    ];
}

/**
 * The frame that shows the page after a command, or the last one.
 */
export function frameOf({ commands, frames }: Recording, command?: number) {
    const finished = command === undefined ? undefined : commands[command]?.time?.finished;
    const candidates = finished === undefined ? frames : frames.filter(frame => frame.timestamp <= finished);

    return candidates.at(-1) ?? frames.at(-1);
}
