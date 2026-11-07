import type Context from '../Context';
import { Return } from '../context/Return';
import { type Browser } from '../shims/Browser';
import { type CallStack, type PortalRequest, type PortalResponse } from './CallStack';

const DEFAULT_HANDOFF_TIMEOUT = 30 * 60 * 1000;

type Holder = { resolve: (value: unknown) => void };

/**
 * A test hands its context to another client, usually an agent, and stays blocked in the call to handoff(). Portal
 * requests have to be answered by the process of the application, so while another client drives the browser they
 * are sent to the blocked test instead of to whoever called the page. When it ends, the test continues.
 */
export class PortalHandoff {
    readonly name: string;
    readonly browser: Browser;
    state: 'waiting'|'claimed' = 'waiting';

    private readonly context: Context;
    private readonly finished = Promise.withResolvers<string>();
    private readonly timer: NodeJS.Timeout;
    private queue: { request: PortalRequest, stack: CallStack }[] = [];
    private holder?: Holder;
    private inFlight = false;
    private endReason?: string;

    constructor(context: Context, browser: Browser, holder: Holder, { name = '', timeout = DEFAULT_HANDOFF_TIMEOUT }: any = {}) {
        this.context = context;
        this.browser = browser;
        this.holder = holder;
        this.name = name;

        this.timer = setTimeout(() => this.end('timeout'), timeout);
        this.timer.unref();
    }

    get done() {
        return this.finished.promise;
    }

    get active() {
        return this.endReason === undefined;
    }

    enqueue(request: PortalRequest, stack: CallStack) {
        this.queue.push({ request, stack });
        this.sendNext();
    }

    private sendNext() {
        if (this.inFlight || this.holder === undefined || this.queue.length === 0) {
            return;
        }

        const { request, stack } = this.queue[0];
        const holder = this.holder;
        this.holder = undefined;
        this.inFlight = true;

        holder.resolve(stack.createServerRequest(request));
    }

    async respond(response: PortalResponse, res: Holder) {
        const current = this.queue[0];
        if (current === undefined || current.request.psuri !== response.psuri) {
            throw new Error(`Portal response [${response.psuri}] does not match the active portal request.`);
        }

        await current.stack.deliverPortalResponse(response);
        this.queue.shift();
        this.inFlight = false;

        if (this.endReason !== undefined) {
            this.context.portalHandoff = undefined;
            res.resolve(this.result);
            return;
        }

        this.holder = res;
        this.sendNext();
    }

    private get result() {
        return Return.Value(this.endReason).serialize();
    }

    /**
     * The test can only be told when it is not handling a request, otherwise this happens with its response.
     */
    end(reason: string) {
        if (this.endReason !== undefined) {
            return;
        }
        this.endReason = reason;
        clearTimeout(this.timer);

        // Whatever the test did not get to goes back to the stacks, for the calls it makes next.
        const unsent = this.inFlight ? this.queue.splice(1) : this.queue.splice(0);
        unsent.forEach(({ request, stack }) => stack.portal.queue.backlog.push(request));

        if (! this.inFlight) {
            this.context.portalHandoff = undefined;
            this.holder?.resolve(this.result);
            this.holder = undefined;
        }

        this.finished.resolve(reason);
    }

    // The requests of a stack that went away were failed already.
    forget(stack: CallStack) {
        const [head] = this.queue;
        this.queue = this.queue.filter((item) => item.stack !== stack);

        if (head?.stack === stack && this.inFlight) {
            this.inFlight = false;
            this.sendNext();
        }
    }

    clientDisconnected(response: Holder) {
        if (this.holder === response) {
            this.holder = undefined;
            this.end('client-disconnected');
        }
    }
}
