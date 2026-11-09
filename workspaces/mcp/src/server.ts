import { writeFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { type Config } from './config';
import { createDraft } from './drafts';
import { type ErrorCode, ToolError, toToolError } from './errors';
import { DEFAULT_TIMEOUT, type OperationKind, operationKind, operationSummary, runOperation, type Step, stepSchema, validateStep } from './operations';
import { MAX_CHANGES, observableLines, outlineChanges, outlineScript, textScript } from './outline';
import { commandDetails, commandLine, numberedCommands, decodeRecording, failedRequestLine, frameOf, logLine, parseRecording, readRecording, responseLine, summarize } from './recordings';
import { type Session, SessionManager } from './sessions';

const INSTRUCTIONS = `Puth drives a real browser for testing. Start with puth_status.
Results are compact: "+"/"-" lines say what appeared or disappeared on the page, including text in quotes, so inspect only when you need more.
Selectors starting with ~ are position based, avoid them in tests.
To use an application behind a login or with test data: write a test that sets this up and calls $browser->handoff(), run it in the background, then claim it with puth_session_create handoff=<id from puth_contexts>. Closing the session lets the test continue.
puth_contexts and puth_context show any test that ran on this instance, also why it failed. After writing a test, run it and read its context there.
Exported drafts are unverified until the real test suite passed them.
Close sessions with puth_session_close when done, also after a failure.`;

const EXPECTATION_CODES: Record<OperationKind, ErrorCode> = {
    navigate: 'OPERATION_FAILED',
    action: 'ACTION_FAILED',
    wait: 'WAIT_FAILED',
    assertion: 'ASSERTION_FAILED',
};

const MAX_VALUE = 2000;

const HANDOFF_RESULT_WAIT = 15 * 1000;

// How outline lines start, see outlineScript.
const KIND_PREFIXES: Record<string, RegExp> = {
    heading: /^#/,
    alert: /^!/,
    text: /^"/,
    button: /^button /,
    link: /^link /,
    input: /^(input:|textarea )/,
    select: /^select /,
};

// Shown when an outline is cut off, so an agent can pick a kind instead of reading on.
const kindCounts = (lines: string[]) => {
    const counts = Object.entries(KIND_PREFIXES)
        .map(([kind, prefix]) => [kind, lines.filter(line => prefix.test(line)).length] as const)
        .filter(([, count]) => count > 0)
        .map(([kind, count]) => `${count} ${kind}`);

    return counts.length === 0 ? undefined : `kinds: ${counts.join(', ')}, filter with kind=`;
};

const sessionId = z.string();

const bound = (value: string, limit = MAX_VALUE) => value.length > limit ? `${value.slice(0, limit)}… [${value.length - limit} more]` : value;

// Plain text sent once. Results are read by a model, and every token of them stays in its context.
const reply = (...lines: (string|undefined)[]) => ({
    content: [{ type: 'text' as const, text: lines.filter(line => line !== undefined && line !== '').join('\n') }],
});

const failure = (error: ToolError, ...lines: (string|undefined)[]) => ({
    ...reply(`ERR ${error.code}: ${bound(error.message)}`, ...lines),
    isError: true,
});

const page = <T>(items: T[], cursor: number, limit: number) => ({
    items: items.slice(cursor, cursor + limit),
    more: cursor + limit < items.length ? `… ${items.length - cursor - limit} more, cursor=${cursor + limit}` : undefined,
});

const age = (time: number) => {
    const minutes = Math.round((Date.now() - time) / 60000);

    return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
};

export function createServer(config: Config) {
    const sessions = new SessionManager(config);
    const server = new McpServer({ name: 'puth', version: '0.0.0' }, { instructions: INSTRUCTIONS });

    const tool = <Shape extends z.ZodRawShape>(
        name: string,
        description: string,
        inputSchema: Shape,
        handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<any>,
    ) => {
        server.registerTool(name, { description, inputSchema }, (async (input: any) => {
            try {
                return await handler(input);
            } catch (error) {
                return failure(toToolError(error, config.instanceUrl));
            }
        }) as any);
    };

    const resolveUrl = (url: string) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
            return url;
        }
        if (config.appUrl === undefined) {
            throw new ToolError('INVALID_REQUEST', `Relative URL [${url}] needs PUTH_APP_URL to be configured.`);
        }

        return new URL(url, `${config.appUrl}/`).toString();
    };

    /**
     * Compares the page with what the agent last saw, and only reports the difference.
     */
    const pageUpdate = async (session: Session): Promise<string[]> => {
        const lines: string[] = [];

        try {
            const outline = JSON.parse(await session.quietly(() => session.browser.evaluate(outlineScript(null))));
            const known = session.known;
            const navigated = outline.url !== known.url;
            const observable = observableLines(outline);

            if (navigated || outline.title !== known.title) {
                lines.push(`at ${outline.url} "${outline.title}"`);
            }

            // On a new page everything is new, so its start says more than a list of changes.
            if (navigated) {
                const { items, more } = page<string>(outline.lines, 0, MAX_CHANGES);
                lines.push(...items, ...(more === undefined ? [] : [more.replace('more,', 'more, puth_inspect'), kindCounts(observable)!]));
            } else {
                lines.push(...outlineChanges(known.lines, observable));
            }

            session.known = { url: outline.url, title: outline.title, lines: observable };
        } catch (error) {
            const toolError = toToolError(error, config.instanceUrl);
            lines.push(toolError.code === 'DIALOG_OPEN'
                ? '! a dialog is open, answer it with the dialog operation'
                : `! could not report page changes: ${bound(toolError.message, 200)}`);
        }

        const diagnostics = await sessions.diagnostics().catch(() => undefined);
        if (diagnostics?.contexts?.find((context: any) => context.id === session.contextId)?.recording?.truncated) {
            lines.push('! the recording reached its budget and misses later evidence');
        }

        return lines;
    };

    const runSteps = async (session: Session, steps: Step[]) => {
        const values: string[] = [];

        for (const [index, input] of steps.entries()) {
            const step = input.url !== undefined && ['visit', 'waitUrl'].includes(input.op)
                ? { ...input, url: resolveUrl(input.url) }
                : input;
            const kind = operationKind(step);

            try {
                validateStep(step);

                // An open dialog blocks everything except answering it.
                if (step.op !== 'dialog') {
                    await session.browser.setTimeout(step.timeout ?? DEFAULT_TIMEOUT);
                }

                const value = await session.withDeadline(() => runOperation(session, step));
                session.record({ kind, step, outcome: 'passed' });

                if (step.op === 'evaluate') {
                    values.push(`= ${bound(String(value))}`);
                }
            } catch (error) {
                const toolError = toToolError(error, config.instanceUrl, EXPECTATION_CODES[kind]);
                session.record({ kind, step, outcome: 'failed', error: toolError.message });

                const invalidated = toolError.code === 'OPERATION_TIMEOUT' || toolError.code === 'SESSION_LOST' || toolError.code === 'INSTANCE_UNAVAILABLE';

                return failure(
                    toolError,
                    `at step ${index} ${step.op}, ${index} passed`,
                    ...values,
                    ...(invalidated ? [] : await pageUpdate(session)),
                );
            }
        }

        return reply(`ok ${steps.length}`, ...values, ...await pageUpdate(session));
    };

    tool(
        'puth_status',
        'Show the connection, sessions and tests waiting for a handoff.',
        {},
        async () => {
            const health = await sessions.health();
            const contexts = await sessions.contexts();
            const waiting = contexts.filter(({ handoff }) => handoff?.state === 'waiting');

            return reply(
                `connected ${config.instanceUrl} puth ${health.version} instance ${health.instanceId.slice(0, 8)}`,
                `app ${config.appUrl ?? 'not configured'} (relative URLs resolve against it, not the current page; opened by the browser, so it has to be reachable from where Puth runs Chrome)`,
                `artifacts ${config.artifactDirectory}`,
                ...sessions.list().map(({ id, journal }) => `session ${id} ${journal.length} steps`),
                ...waiting.map(({ id, name, handoff }) => `handoff ${id.slice(0, 8)} "${handoff?.name || name}"`),
            );
        },
    );

    tool(
        'puth_session_create',
        'Create an isolated browser session, or take over a test that called handoff().',
        {
            name: z.string().min(1).max(200).default('MCP session'),
            url: z.string().max(4000).optional().describe('Relative URLs use the application URL'),
            viewport: z.object({ width: z.number().int().min(100).max(7680), height: z.number().int().min(100).max(4320) }).optional(),
            handoff: z.string().optional().describe('Id from puth_contexts of a test waiting for a handoff'),
        },
        async ({ name, url, viewport, handoff }) => {
            const target = url === undefined ? undefined : resolveUrl(url);
            const session = handoff === undefined ? await sessions.create(name) : await sessions.claim(handoff);
            const origin = handoff === undefined
                ? undefined
                : `took over "${session.handoffName}" from ${session.handoffTest}, its login and data apply`;

            return session.run(async () => {
                await session.annotate({ kind: 'tool', tool: 'puth_session_create', summary: target ?? '' });
                if (viewport !== undefined) {
                    await session.browser.resize(viewport.width, viewport.height);
                }
                if (target !== undefined) {
                    await session.browser.visit(target);
                    session.record({ kind: 'navigate', step: { op: 'visit', url: target }, outcome: 'passed' });
                }

                return reply(`session ${session.id}`, origin, ...await pageUpdate(session));
            });
        },
    );

    tool(
        'puth_session_close',
        'Close a session. A test that handed off continues, and its result is reported if it finishes within a few seconds.',
        { sessionId },
        async ({ sessionId }) => {
            const contextId = sessions.handoffContext(sessionId);
            const closed = await sessions.close(sessionId);
            if (! closed || contextId === undefined) {
                return reply(closed ? 'closed' : 'closed already');
            }

            const finished = await sessions.waitForResult(contextId, HANDOFF_RESULT_WAIT);
            if (finished === undefined) {
                return reply('closed, the test is still running. Read its result later with puth_context.');
            }

            return reply('closed, the test finished:', ...summarize(parseRecording(decodeRecording(await sessions.recording(contextId)))));
        },
    );

    tool(
        'puth_run',
        `Run steps in order on the selected page and stop at the first failure. Actions wait until their target can be acted on and never repeat; assertions and waits retry for timeout ms (3000). Operations: ${operationSummary}. evaluate takes a JavaScript expression and returns its JSON value. text in press and clickLink is the visible text. seeIn checks that an element contains text, textIs that it is exactly that text.`,
        { sessionId, steps: z.array(stepSchema).min(1).max(50) },
        async ({ sessionId, steps }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                await session.annotate({ kind: 'tool', tool: 'puth_run', summary: bound(steps.map(({ op }) => op).join(', '), 200), steps: steps.length });

                return runSteps(session, steps as Step[]);
            });
        },
    );

    tool(
        'puth_pages',
        'List open pages, or select the one later tools use.',
        { sessionId, select: z.number().int().min(0).optional() },
        async ({ sessionId, select }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                await session.annotate({ kind: 'tool', tool: 'puth_pages', summary: select === undefined ? 'list' : `select ${select}` });
                if (select !== undefined) {
                    session.browser = await session.browser.onPage(select);
                    session.pageIndex = select;
                    session.known = { lines: [] };
                }

                const pages = await session.browser.openPages();

                return reply(...pages.map(({ index, url, title }) => `${index === session.pageIndex ? '*' : ' '}${index} ${url} "${bound(title, 80)}"`));
            });
        },
    );

    tool(
        'puth_inspect',
        'Outline the selected page in document order: headings (#), alerts (!), and interactive elements as: kind "label" selector =value flags. Use selector to look at a part of the page, find to search it, text for its visible text.',
        {
            sessionId,
            selector: z.string().max(1000).optional().describe('Limit to this element'),
            text: z.boolean().default(false).describe('Return the visible text instead'),
            find: z.string().max(200).optional().describe('Only lines containing this, ignoring case'),
            kind: z.enum(['heading', 'alert', 'text', 'button', 'link', 'input', 'select']).optional().describe('Only lines of this kind'),
            cursor: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(300).default(60),
        },
        async ({ sessionId, selector, text, find, kind, cursor, limit }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                await session.annotate({
                    kind: 'tool',
                    tool: 'puth_inspect',
                    summary: [text ? 'text' : 'outline', selector, find && `find "${find}"`, kind].filter(Boolean).join(' '),
                });
                if (text) {
                    const visible = String(await session.quietly(() => session.browser.evaluate(textScript(selector ?? null))));
                    const searched = find === undefined
                        ? visible
                        : visible.split('\n').filter(line => line.toLowerCase().includes(find.toLowerCase())).join('\n');

                    return reply(bound(searched, 8000) || (find === undefined ? 'no visible text' : 'no matches in the visible text'));
                }

                const outline = JSON.parse(await session.quietly(() => session.browser.evaluate(outlineScript(selector ?? null))));
                if (outline.missing) {
                    throw new ToolError('INVALID_REQUEST', `Nothing matches [${selector}].`);
                }
                const observable = observableLines(outline);
                if (selector === undefined) {
                    session.known = { url: outline.url, title: outline.title, lines: observable };
                }

                const needle = find?.toLowerCase();
                const prefix = kind === undefined ? undefined : KIND_PREFIXES[kind];
                const matching = (needle === undefined && prefix === undefined ? outline.lines : observable)
                    .filter((line: string) => needle === undefined || line.toLowerCase().includes(needle))
                    .filter((line: string) => prefix === undefined || prefix.test(line));
                const { items, more } = page<string>(matching, cursor, limit);
                const empty = items.length === 0
                    ? (needle === undefined && prefix === undefined ? 'nothing visible to outline' : 'no matches in the outline or visible text')
                    : undefined;

                return reply(`at ${outline.url} "${outline.title}"`, empty, ...items, more, more === undefined ? undefined : kindCounts(matching));
            });
        },
    );

    tool(
        'puth_screenshot',
        'Capture the selected page or one element as an image, and save it as an artifact. Prefer puth_inspect, images cost far more.',
        { sessionId, selector: z.string().max(1000).optional() },
        async ({ sessionId, selector }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                await session.annotate({ kind: 'tool', tool: 'puth_screenshot', summary: selector ?? 'page' });
                const options = { type: 'jpeg', quality: 60, encoding: 'base64' };
                const target = selector === undefined ? session.browser : await session.browser.firstOrFail(selector);
                const data = await (target as any).screenshot(options) as string;
                const file = await session.artifactPath(`screenshot-${session.artifacts.length + 1}.jpg`);
                await writeFile(file, Buffer.from(data, 'base64'));

                return {
                    content: [
                        { type: 'image' as const, data, mimeType: 'image/jpeg' },
                        { type: 'text' as const, text: file },
                    ],
                };
            });
        },
    );

    tool(
        'puth_events',
        'Read console, errors or network activity of a session. network shows failed requests, HTTP errors and page or API calls, all=true adds the rest.',
        {
            sessionId,
            type: z.enum(['console', 'errors', 'network']),
            all: z.boolean().default(false),
            cursor: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(200).default(30),
        },
        async ({ sessionId, type, all, cursor, limit }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                const lines = await eventLines(session, type, all);
                const { items, more } = page(lines, cursor, limit);

                return reply(items.length === 0 ? 'none' : undefined, ...items, more);
            });
        },
    );

    const eventLines = async ({ context }: Session, type: string, all: boolean): Promise<string[]> => {
        if (type === 'network') {
            const failed = await context.getSnapshotsByType('update');
            const responses = await context.getSnapshotsByType('response');
            const relevant = responses.filter(({ status, resourceType }: any) =>
                all || status >= 400 || ['document', 'xhr', 'fetch'].includes(resourceType));

            return [
                ...failed.filter(({ specific }: any) => specific === 'request.failed').map(failedRequestLine),
                ...relevant.map(responseLine),
            ];
        }

        const logs = await context.getSnapshotsByType('log');
        const selected = logs.filter(({ messageType }: any) => (messageType === 'error') === (type === 'errors')).map(logLine);
        if (type !== 'errors') {
            return selected;
        }

        const commands = await context.getSnapshotsByType('command');

        return [...selected, ...commands.flatMap((command: any, index: number) => command.errors?.length > 0 ? [commandLine(command, index)] : [])];
    };

    tool(
        'puth_contexts',
        'List tests and sessions this Puth instance knows about, including finished ones, newest first. Read one with puth_context.',
        {
            status: z.enum(['failed', 'successful', 'pending']).optional(),
            query: z.string().max(200).optional().describe('Part of the test name or group'),
            limit: z.number().int().min(1).max(100).default(20),
        },
        async ({ status, query, limit }) => {
            const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, ' ');
            const needle = query === undefined ? undefined : normalize(query);
            const matching = (await sessions.contexts())
                .filter(context => context.group !== 'mcp')
                .filter(context => status === undefined || context.status === status)
                .filter(context => needle === undefined || normalize(`${context.name} ${context.group}`).includes(needle))
                .sort((a, b) => b.createdAt - a.createdAt);
            const { items, more } = page(matching, 0, limit);

            return reply(
                items.length === 0 ? 'none' : undefined,
                ...items.map(({ id, name, group, status, active, createdAt, handoff }) =>
                    `${id.slice(0, 8)} ${status} "${name}"${group ? ` ${group.split('\\').pop()}` : ''} ${age(createdAt)}${active ? ' running' : ''}${handoff ? ` handoff:${handoff.state}` : ''}`),
                more,
            );
        },
    );

    tool(
        'puth_context',
        'Read what a test recorded: id from puth_contexts or a session, or a .puth file. view summary shows what went wrong in order, commands, console and network list everything; commands leaves out what test runners do around a test unless all=true. command shows one command with its full arguments. frame returns the page as an image after that command number, -1 for the last one.',
        {
            id: z.string().optional(),
            file: z.string().optional().describe('Path to a .puth snapshot'),
            view: z.enum(['summary', 'commands', 'console', 'network']).default('summary'),
            frame: z.number().int().min(-1).optional(),
            command: z.number().int().min(0).optional().describe('Show one command with its full arguments'),
            all: z.boolean().default(false).describe('Also list commands test runners make around a test'),
            cursor: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(200).default(50),
        },
        async ({ id, file, view, frame, command, all, cursor, limit }) => {
            if ((id === undefined) === (file === undefined)) {
                throw new ToolError('INVALID_REQUEST', 'Pass either id or file.');
            }

            const packets = file !== undefined
                ? await readRecording(file).catch(() => {
                    throw new ToolError('CONTEXT_NOT_FOUND', `Can not read snapshot [${file}].`);
                })
                : decodeRecording(await sessions.recording(await sessions.resolveContext(id!)));
            const recording = parseRecording(packets);

            if (frame !== undefined) {
                const found = frameOf(recording, frame === -1 ? undefined : frame);
                if (found === undefined) {
                    return reply('no frames recorded');
                }

                return { content: [{ type: 'image' as const, data: Buffer.from(found.frame).toString('base64'), mimeType: 'image/jpeg' }] };
            }

            if (command !== undefined) {
                const found = recording.commands[command];
                if (found === undefined) {
                    throw new ToolError('INVALID_REQUEST', `There is no command [${command}], the recording has ${recording.commands.length}.`);
                }

                return reply(...commandDetails(found, command));
            }

            if (view === 'summary') {
                return reply(...summarize(recording));
            }

            const lines = view === 'commands'
                ? numberedCommands(recording.commands, all).map(({ command, index }) => commandLine(command, index))
                : view === 'console'
                    ? recording.logs.map(logLine)
                    : [...recording.failedRequests.map(failedRequestLine), ...recording.responses.map(responseLine)];
            const { items, more } = page<string>(lines, cursor, limit);

            return reply(items.length === 0 ? 'none' : undefined, ...items, more);
        },
    );

    tool(
        'puth_export',
        'Export a snapshot file, the recorded steps, or a php or laravel test draft of the passed steps. After a handoff, a draft holds only the steps for that test. Drafts are unverified until the real test suite passed them.',
        {
            sessionId,
            format: z.enum(['snapshot', 'steps', 'php', 'laravel']),
            name: z.string().min(1).max(200).default('Recorded workflow'),
            steps: z.array(z.number().int().min(0)).max(1000).optional().describe('Step numbers, by default all passed steps'),
        },
        async ({ sessionId, format, name, steps }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                if (format === 'snapshot') {
                    const snapshot = await sessions.snapshot(session);
                    const file = await session.artifactPath(`snapshot-${session.artifacts.length + 1}.puth`);
                    await writeFile(file, snapshot);

                    return reply(file);
                }

                if (format === 'steps') {
                    return reply(...session.journal.map(({ index, step: { op, timeout, ...parameters }, outcome }) =>
                        `${index} ${outcome === 'failed' ? '✗ ' : ''}${op} ${bound(JSON.stringify(parameters), 200)}`));
                }

                const selected = steps === undefined
                    ? session.journal.filter(({ outcome }) => outcome === 'passed')
                    : steps.map((index) => {
                        const step = session.journal[index];
                        if (step === undefined) {
                            throw new ToolError('INVALID_REQUEST', `There is no step [${index}].`);
                        }

                        return step;
                    });

                const { code } = createDraft({
                    target: format,
                    name,
                    steps: selected,
                    appUrl: config.appUrl,
                    artifacts: session.artifacts,
                    sessionId: session.id,
                    fragment: session.handoff,
                });

                // The draft shows up next to the steps it was made of.
                await session.annotate({ kind: 'draft', tool: 'puth_export', format, name, code, steps: selected.length });

                return reply(code);
            });
        },
    );

    return { server, sessions };
}
