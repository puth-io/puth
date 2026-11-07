import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { type Browser, Context, RemotePuthClient } from '@puth/client';
import { type Config } from './config';
import { instanceUnavailable, ToolError } from './errors';
import { type OperationKind } from './operations';

export type JournalStep = {
    index: number;
    kind: OperationKind|'navigate';
    step: { operation: string } & Record<string, any>;
    outcome: 'passed'|'failed';
    error?: string;
    page: number;
    url?: string;
};

export type Health = { version: string; instanceId: string; capabilities: string[] };

export class Session {
    readonly id = randomUUID();
    readonly createdAt = Date.now();
    readonly journal: JournalStep[] = [];
    readonly artifacts: string[] = [];

    pageIndex = 0;
    lastActivity = Date.now();

    private queue: Promise<unknown> = Promise.resolve();
    private invalidated = false;

    constructor(
        private readonly manager: SessionManager,
        readonly context: Context,
        public browser: Browser,
    ) {}

    get contextId() {
        return this.context.getRepresentation().id;
    }

    get directory() {
        return path.join(this.manager.config.artifactDirectory, this.id);
    }

    /**
     * Operations of a session run one after the other, sessions run independently of each other.
     */
    run<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.queue.then(() => this.runWithDeadline(operation));
        this.queue = result.catch(() => {});

        return result;
    }

    private async runWithDeadline<T>(operation: () => Promise<T>): Promise<T> {
        if (this.invalidated) {
            throw new ToolError('SESSION_INVALIDATED', 'This session was closed after an operation timed out. Create a new session.');
        }

        this.lastActivity = Date.now();
        this.manager.scheduleIdleCheck(this);

        const { operationTimeout } = this.manager.config;
        let timer: NodeJS.Timeout|undefined;
        const deadline = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new ToolError(
                'OPERATION_TIMEOUT',
                `The operation did not finish in ${operationTimeout}ms. Its state is unknown, so the session was closed.`,
            )), operationTimeout);
        });

        try {
            return await Promise.race([operation(), deadline]);
        } catch (error) {
            // There is no way to cancel a running call, and later calls could act on a page in an unknown state.
            if (error instanceof ToolError && error.code === 'OPERATION_TIMEOUT') {
                this.invalidated = true;
                await this.manager.close(this.id);
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    record(step: Omit<JournalStep, 'index'|'page'>) {
        this.journal.push({ ...step, index: this.journal.length, page: this.pageIndex });
    }

    async artifactPath(name: string) {
        await mkdir(this.directory, { recursive: true });
        const file = path.join(this.directory, name);
        this.artifacts.push(file);

        return file;
    }
}

export class SessionManager {
    private readonly sessions = new Map<string, Session>();
    private readonly closed = new Set<string>();
    private readonly idleTimers = new Map<string, NodeJS.Timeout>();
    private readonly client: RemotePuthClient;

    constructor(readonly config: Config) {
        this.client = new RemotePuthClient(config.instanceUrl);
    }

    async health(): Promise<Health> {
        const response = await fetch(`${this.config.instanceUrl}/health`).catch(() => {
            throw instanceUnavailable(this.config.instanceUrl);
        });
        if (! response.ok) {
            throw instanceUnavailable(this.config.instanceUrl);
        }

        return response.json();
    }

    async diagnostics(): Promise<any> {
        return (await fetch(`${this.config.instanceUrl}/diagnostics`)).json();
    }

    async snapshot(session: Session): Promise<Uint8Array> {
        // Only reached with a session of this server, which is what makes reading the context allowed.
        const response = await fetch(`${this.config.instanceUrl}/context/${session.contextId}/snapshot`);
        if (! response.ok) {
            throw new ToolError('SESSION_LOST', 'The Puth instance does not know this session anymore.');
        }

        return new Uint8Array(await response.arrayBuffer());
    }

    async create(name: string): Promise<Session> {
        await this.health();

        const context = await Context.create(this.client, {
            snapshot: true,
            portal: false,
            detour: false,
            track: ['network'],
            group: 'mcp',
            test: { name },
        });
        const session = new Session(this, context, await context.createBrowserShim());

        this.sessions.set(session.id, session);
        this.scheduleIdleCheck(session);

        return session;
    }

    get(id: string): Session {
        const session = this.sessions.get(id);
        if (session !== undefined) {
            return session;
        }

        throw this.closed.has(id)
            ? new ToolError('SESSION_CLOSED', `Session [${id}] was closed.`)
            : new ToolError('SESSION_NOT_FOUND', `Session [${id}] does not belong to this server. Only sessions from puth_session_create can be used.`);
    }

    list() {
        return [...this.sessions.values()];
    }

    /**
     * Closing twice succeeds, because the caller only cares about the session being gone.
     */
    async close(id: string): Promise<boolean> {
        const session = this.sessions.get(id);
        if (session === undefined) {
            if (this.closed.has(id)) {
                return false;
            }
            throw new ToolError('SESSION_NOT_FOUND', `Session [${id}] does not belong to this server.`);
        }

        this.sessions.delete(id);
        this.closed.add(id);
        clearTimeout(this.idleTimers.get(id));
        this.idleTimers.delete(id);

        await session.context.destroy({ immediately: true }).catch(() => {});

        return true;
    }

    closeAll() {
        return Promise.allSettled(this.list().map(session => this.close(session.id)));
    }

    scheduleIdleCheck(session: Session) {
        clearTimeout(this.idleTimers.get(session.id));

        const timer = setTimeout(() => void this.close(session.id), this.config.idleTimeout);
        timer.unref();
        this.idleTimers.set(session.id, timer);
    }
}
