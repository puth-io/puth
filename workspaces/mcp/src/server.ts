import { writeFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { type Config } from './config';
import { createDraft } from './drafts';
import { type ErrorCode, ToolError, toToolError } from './errors';
import { inspectScript } from './inspect';
import { DEFAULT_TIMEOUT, type OperationKind, operationSchema, runOperation } from './operations';
import { type Session, SessionManager } from './sessions';

const MAX_MESSAGE = 500;

const sessionId = z.string().describe('From puth_session_create');

const bound = (value: unknown, limit = MAX_MESSAGE) => {
    const text = String(value ?? '');

    return text.length > limit ? `${text.slice(0, limit)}... [truncated]` : text;
};

const success = (data: Record<string, unknown>) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    structuredContent: { outcome: 'passed', ...data },
});

const failure = (error: ToolError, data: Record<string, unknown> = {}) => {
    const structured = { outcome: 'failed', error: { code: error.code, message: bound(error.message, 2000) }, ...data };

    return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify(structured) }],
        structuredContent: structured,
    };
};

const EXPECTATION_CODES: Record<OperationKind, ErrorCode> = {
    action: 'ACTION_FAILED',
    wait: 'WAIT_FAILED',
    assertion: 'ASSERTION_FAILED',
};

export function createServer(config: Config) {
    const sessions = new SessionManager(config);
    const server = new McpServer({ name: 'puth', version: '0.0.0' });

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

    // Always describes where the page ended up, also after a failure.
    const evidence = async (session: Session): Promise<Record<string, unknown>> => {
        const page: Record<string, unknown> = { sessionId: session.id, page: session.pageIndex };
        const warnings: string[] = [];

        try {
            page.url = await session.browser.url();
            page.title = await session.browser.title();
        } catch (error) {
            warnings.push(toToolError(error, config.instanceUrl).code === 'DIALOG_OPEN'
                ? 'A dialog is open and blocks the page. Answer it with the dialog action of puth_action.'
                : 'The page state could not be read.');
        }

        const diagnostics = await sessions.diagnostics().catch(() => undefined);
        const recording = diagnostics?.contexts?.find((context: any) => context.id === session.contextId)?.recording;
        if (recording?.truncated) {
            warnings.push('The recording reached its budget and is missing later evidence.');
        }

        return { ...page, ...(warnings.length > 0 ? { warnings } : {}) };
    };

    const runStep = async (session: Session, kind: OperationKind, step: any) => session.run(async () => {
        try {
            // An open dialog blocks everything except answering it.
            if (step.operation !== 'dialog') {
                await session.browser.setTimeout(step.timeout ?? DEFAULT_TIMEOUT);
            }

            await runOperation(session.browser, step);
        } catch (error) {
            const toolError = toToolError(error, config.instanceUrl, EXPECTATION_CODES[kind]);
            session.record({ kind, step, outcome: 'failed', error: toolError.message });

            return failure(toolError, await evidence(session));
        }

        const result = await evidence(session);
        session.record({ kind, step, outcome: 'passed', url: result.url as string|undefined });

        return success({ ...result, operation: step.operation });
    });

    tool(
        'puth_status',
        'Report the Puth endpoint, application URL, instance and sessions of this server.',
        {},
        async () => {
            const base = {
                endpoint: config.instanceUrl,
                appUrl: config.appUrl ?? null,
                appUrlNote: 'The application URL is resolved by the browser, so it must be reachable from where Puth runs Chrome.',
                artifactDirectory: config.artifactDirectory,
                sessions: sessions.list().map(({ id, createdAt, lastActivity, journal }) => ({
                    id,
                    createdAt,
                    lastActivity,
                    steps: journal.length,
                })),
            };

            try {
                return success({ ...base, connected: true, ...await sessions.health() });
            } catch (error) {
                return failure(toToolError(error, config.instanceUrl), { ...base, connected: false });
            }
        },
    );

    tool(
        'puth_session_create',
        'Create an isolated browser session. It has its own Puth context and is closed after 30 idle minutes.',
        {
            name: z.string().min(1).max(200).default('MCP session').describe('Also names exported tests'),
            url: z.string().max(4000).optional().describe('Initial URL, relative ones use the application URL'),
            viewport: z.object({
                width: z.number().int().min(100).max(7680),
                height: z.number().int().min(100).max(4320),
            }).optional(),
        },
        async ({ name, url, viewport }) => {
            const target = url === undefined ? undefined : resolveUrl(url);
            const session = await sessions.create(name);

            return session.run(async () => {
                if (viewport !== undefined) {
                    await session.browser.resize(viewport.width, viewport.height);
                }
                if (target !== undefined) {
                    await session.browser.visit(target);
                    session.record({ kind: 'navigate', step: { operation: 'navigate', url: target }, outcome: 'passed', url: target });
                }

                return success({ ...await evidence(session), name });
            });
        },
    );

    tool(
        'puth_session_close',
        'Close a session and destroy its context. Closing a closed session succeeds.',
        { sessionId },
        async ({ sessionId }) => success({ sessionId, closed: true, alreadyClosed: ! await sessions.close(sessionId) }),
    );

    tool(
        'puth_navigate',
        'Navigate the selected page of a session.',
        { sessionId, url: z.string().min(1).max(4000).describe('Relative URLs use the application URL') },
        async ({ sessionId, url }) => {
            const session = sessions.get(sessionId);
            const target = resolveUrl(url);

            return session.run(async () => {
                await session.browser.visit(target);
                const result = await evidence(session);
                session.record({ kind: 'navigate', step: { operation: 'navigate', url: target }, outcome: 'passed', url: target });

                return success(result);
            });
        },
    );

    tool(
        'puth_pages',
        'List the open pages of a session, or select the page later tools use.',
        { sessionId, select: z.number().int().min(0).optional().describe('Index of the page to select') },
        async ({ sessionId, select }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                if (select !== undefined) {
                    session.browser = await session.browser.onPage(select);
                    session.pageIndex = select;
                }

                return success({
                    sessionId: session.id,
                    selected: session.pageIndex,
                    pages: (await session.browser.openPages()).map(page => ({ ...page, title: bound(page.title, 200) })),
                });
            });
        },
    );

    tool(
        'puth_inspect',
        'Read the URL, title, visible text and interactive elements of the selected page, with selector candidates.',
        {
            sessionId,
            maxText: z.number().int().min(0).max(20000).default(4000),
            maxElements: z.number().int().min(0).max(200).default(50),
        },
        async ({ sessionId, maxText, maxElements }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => success({
                sessionId: session.id,
                page: session.pageIndex,
                ...JSON.parse(await session.browser.evaluate(inspectScript(maxText, maxElements))),
            }));
        },
    );

    tool(
        'puth_action',
        'Perform one action on the selected page. It waits until its target can be acted on and is never repeated.',
        { sessionId, action: operationSchema('action') as any },
        async ({ sessionId, action }) => runStep(sessions.get(sessionId), 'action', action),
    );

    tool(
        'puth_wait',
        'Wait for a condition on the selected page, 3 seconds by default.',
        { sessionId, wait: operationSchema('wait') as any },
        async ({ sessionId, wait }) => runStep(sessions.get(sessionId), 'wait', wait),
    );

    tool(
        'puth_assert',
        'Check something on the selected page. A failed assertion is a tool error, not a successful validation.',
        { sessionId, assertion: operationSchema('assertion') as any },
        async ({ sessionId, assertion }) => runStep(sessions.get(sessionId), 'assertion', assertion),
    );

    tool(
        'puth_screenshot',
        'Capture the selected page as an image and save it as an artifact.',
        { sessionId },
        async ({ sessionId }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                const data = await session.browser.screenshot({ type: 'png', encoding: 'base64' }) as unknown as string;
                const file = await session.artifactPath(`screenshot-${session.artifacts.length + 1}.png`);
                await writeFile(file, Buffer.from(data, 'base64'));

                const result = { ...await evidence(session), artifact: file };

                return {
                    content: [
                        { type: 'image' as const, data, mimeType: 'image/png' },
                        { type: 'text' as const, text: JSON.stringify(result) },
                    ],
                    structuredContent: { outcome: 'passed', ...result },
                };
            });
        },
    );

    tool(
        'puth_events',
        'Read console output, errors or network activity of a session, one page of results at a time.',
        {
            sessionId,
            type: z.enum(['console', 'errors', 'network']),
            cursor: z.number().int().min(0).default(0),
            limit: z.number().int().min(1).max(200).default(50),
        },
        async ({ sessionId, type, cursor, limit }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                let events: Record<string, unknown>[];

                if (type === 'network') {
                    const responses = await session.context.getSnapshotsByType('response');
                    events = responses.map(({ method, status, url, resourceType }: any) => ({ method, status, url: bound(url), resourceType }));
                } else {
                    const logs = await session.context.getSnapshotsByType('log');
                    const isError = (log: any) => log.messageType === 'error';
                    const selected = logs.filter((log: any) => isError(log) === (type === 'errors'));

                    events = selected.map((log: any) => ({ type: log.messageType, text: bound(log.text), timestamp: log.timestamp }));

                    if (type === 'errors') {
                        const commands = await session.context.getSnapshotsByType('command');
                        events.push(...commands.filter((command: any) => command.errors?.length > 0).map((command: any) => ({
                            type: 'command',
                            text: bound(`${command.func}: ${command.errors[0].error?.message ?? 'failed'}`),
                            timestamp: command.timestamp,
                        })));
                    }
                }

                const next = cursor + limit;

                return success({
                    sessionId: session.id,
                    events: events.slice(cursor, next),
                    total: events.length,
                    nextCursor: next < events.length ? next : null,
                });
            });
        },
    );

    tool(
        'puth_export',
        'Export a snapshot for the Puth GUI, the recorded steps, or a PHP or Laravel test draft. Drafts are unverified until the real test suite passed them.',
        {
            sessionId,
            format: z.enum(['snapshot', 'steps', 'php', 'laravel']),
            name: z.string().min(1).max(200).default('Recorded workflow').describe('Name of the exported test'),
            steps: z.array(z.number().int().min(0)).max(1000).optional().describe('Journal indices to export, by default all passed steps'),
        },
        async ({ sessionId, format, name, steps }) => {
            const session = sessions.get(sessionId);

            return session.run(async () => {
                if (format === 'snapshot') {
                    const snapshot = await sessions.snapshot(session);
                    const file = await session.artifactPath(`snapshot-${session.artifacts.length + 1}.puth`);
                    await writeFile(file, snapshot);

                    return success({ sessionId: session.id, artifact: file, bytes: snapshot.byteLength });
                }

                if (format === 'steps') {
                    return success({ sessionId: session.id, steps: session.journal });
                }

                const selected = steps === undefined
                    ? session.journal.filter(({ outcome }) => outcome === 'passed')
                    : steps.map((index) => {
                        const step = session.journal[index];
                        if (step === undefined) {
                            throw new ToolError('INVALID_REQUEST', `There is no journal step with index [${index}].`);
                        }

                        return step;
                    });

                return success({
                    sessionId: session.id,
                    ...createDraft({
                        target: format,
                        name,
                        steps: selected,
                        appUrl: config.appUrl,
                        artifacts: session.artifacts,
                        sessionId: session.id,
                    }),
                });
            });
        },
    );

    return { server, sessions };
}
