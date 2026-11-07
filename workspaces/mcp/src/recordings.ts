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

const timeOf = (packet: any) => packet.time?.started ?? packet.time?.finished ?? packet.timestamp ?? packet.time ?? 0;

const MAX_SUMMARY_EVENTS = 8;

/**
 * What went wrong, in the order it happened, so an error that came first reads as the cause of what failed later.
 */
export function summarize(recording: Recording): string[] {
    const { name, status, commands, logs, responses, failedRequests, frames } = recording;
    const errors = logs.filter(isError);
    const failed = commands.flatMap((command, index) => errorOf(command) === undefined ? [] : [{ time: timeOf(command), line: commandLine(command, index) }]);
    const recent = failed.length > 0 ? [] : commands.slice(-3).map((command, index) => ({ time: timeOf(command), line: commandLine(command, commands.length - Math.min(3, commands.length) + index) }));
    const events = [
        ...failed,
        ...recent,
        ...errors.map(log => ({ time: timeOf(log), line: logLine(log) })),
        ...failedRequests.map(request => ({ time: timeOf(request), line: failedRequestLine(request) })),
        ...responses.filter(response => response.status >= 400).map(response => ({ time: timeOf(response), line: responseLine(response) })),
    ].sort((a, b) => a.time - b.time);
    const last = frames.at(-1)?.page?.url;

    return [
        `${status} "${name}" ${commands.length} commands, ${errors.length} console errors, ${frames.length} frames`,
        ...(last === undefined ? [] : [`last url ${last}`]),
        ...(events.length > MAX_SUMMARY_EVENTS ? [`… ${events.length - MAX_SUMMARY_EVENTS} earlier events, see view=commands or view=console`] : []),
        ...events.slice(-MAX_SUMMARY_EVENTS).map(({ line }) => line),
    ];
}

/**
 * One command with everything it got, for when the shortened list is not enough.
 */
export function commandDetails(command: any, index: number): string[] {
    return [
        `${index} ${command.func} on ${command.on?.type ?? 'unknown'}${command.time?.took === undefined ? '' : `, ${command.time.took}ms`}`,
        ...(command.args ?? []).map((arg: unknown, position: number) => `arg ${position}: ${shorten(arg, 8000)}`),
        ...(command.errors ?? []).map((error: any) => `✗ ${shorten(error.error?.message ?? error.expectation?.message ?? 'failed', 2000)}`),
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
