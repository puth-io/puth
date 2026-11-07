// @ts-ignore
import {
    CDPSession,
    ConnectionClosedError,
    Dialog,
    Page,
    type Protocol,
    ProtocolError,
    TargetCloseError,
} from 'puppeteer-core';
import Context from '../Context';
import { Return } from '../context/Return';
import { Call } from './Call';

const dialogFunctions = ['assertDialogOpened', 'typeInDialog', 'acceptDialog', 'dismissDialog', 'waitForDialog'];

export type PortalRequest = {
    psuri: string;
    ip: string|undefined;
    url: string;
    path: string;
    headers: TODO;
    data: string;
    method: string;
};

export type PortalFailure = {
    reason: string;
    message?: string;
};

export type PortalResponse = {
    psuri: string;
    type: string;
    headers?: TODO;
    body?: string;
    status?: number;
    // Set when the client got no HTTP response at all. HTTP error responses use status instead.
    error?: Partial<PortalFailure>;
};

// Network.ErrorReason values accepted by Fetch.failRequest.
const PORTAL_FAILURE_REASONS = [
    'Failed',
    'Aborted',
    'TimedOut',
    'AccessDenied',
    'ConnectionClosed',
    'ConnectionReset',
    'ConnectionRefused',
    'ConnectionAborted',
    'ConnectionFailed',
    'NameNotResolved',
    'InternetDisconnected',
    'AddressUnreachable',
    'BlockedByClient',
    'BlockedByResponse',
];

function resolvePortalFailure({ error, status, body }: PortalResponse): PortalFailure | undefined {
    if (error != null) {
        const reason = PORTAL_FAILURE_REASONS.includes(error.reason as string) ? error.reason as string : 'Failed';
        return { reason, message: error.message };
    }
    if (typeof status !== 'number' || typeof body !== 'string') {
        return { reason: 'Failed', message: 'Portal response has no status or body.' };
    }
}

export class CallStack {
    private context: Context;
    readonly page: Page;

    activeCall?: Call;
    lastCall?: Call;

    skipCallResponses: Call[] = [];

    private disposed = false;
    private portalTimeout?: NodeJS.Timeout;

    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;
    }

    async call(call: Call, skipQueue: boolean = false) {
        if (!skipQueue && this.portal.queue.backlog.length !== 0) {
            this.logger.debug('offsetting packet...');
            this.portal.initial.call = call;
            this.portal.queue.active = this.portal.queue.backlog;
            this.portal.queue.backlog = [];

            return call.resolve(this.createServerRequest(this.portal.queue.active[0]));
        }
        if (this.context.isPageBlockedByDialog(this.page) && !dialogFunctions.includes(call.packet.function)) {
            return call.resolve(
                Return.ExpectationFailed(
                    'The page has an open dialog that blocks all function calls except those that interact with it.',
                ).serialize(),
            );
        }
        if (this.activeCall != null) {
            this.logger.error(this.activeCall.packet, 'Tried to run call but has already activeCall.');
            throw new Error('Tried to run call but has already activeCall.');
        }
        
        this.logger.debug(call.packet, 'set active call');
        this.activeCall = call;
        this.portal.initial.call = null;

        await this.context.handleCallApply(call);
    }

    conclude(call: Call | undefined, result: any, force = false) {
        if (this.disposed) {
            return;
        }

        this.logger.debug(call?.packet, 'conclude');
        if (call == undefined) {
            this.logger.error({ result }, 'Unhandled call result');
            throw new Error('Unhandled call result');
        }
        if (!force && this.skipCallResponses.includes(call)) {
            this.skipCallResponses.splice(this.skipCallResponses.indexOf(call), 1);
            this.logger.debug(call.packet, 'ignoring call result cause call was in skipCallResponses');

            return;
        }
        if (call != this.activeCall) {
            this.logger.error(
                { call, activeCall: this.activeCall },
                'Tried to call conclude with call that is not currently active',
            );
            throw new Error('Tried to call conclude with call that is not currently active');
        }
        if (this.portal.queue.active.length !== 0) {
            this.logger.debug('set waiting response');
            this.portal.waiting.response = result;

            return;
        }
        
        this.logger.debug(this.activeCall.packet, 'unset active call');
        this.activeCall = undefined;
        this.lastCall = call;
        
        // if a portal queue was active the initial call response is already resolved therefore we use the last clients portal response request
        if (this.portal.open.response != null) {
            if (!call.resolved) {
                throw new Error('Found open portal response but initial call was not resolved.');
            }
            this.logger.debug({ packet: call?.packet, result }, '[Call apply response (from open portal response)]');
            
            let res = this.portal.open.response;
            this.portal.open.response = undefined;
            res.resolve(result);
            
            return res.promise;
        }
        
        this.logger.debug({ packet: call?.packet, result }, '[Call apply response]');
        return call.resolve(result);
    }

    /**
     * Settles everything still waiting on this stack. Results arriving afterwards are ignored.
     */
    dispose(message: string) {
        if (this.disposed) {
            return;
        }
        this.disposed = true;

        clearTimeout(this.portalTimeout);

        const error = { type: 'error', code: 'PageUnavailable', message };
        const { open, initial } = this.portal;
        const pending = [this.activeCall, initial.call];

        this.activeCall = undefined;
        this.portal.queue.active = [];
        this.portal.queue.backlog = [];
        this.portal.waiting.response = null;
        initial.call = null;

        open.response?.resolve(error);
        open.response = undefined;
        pending.forEach((call) => void call?.resolve(error));
    }

    disposeAfter(delay: number, message: string) {
        setTimeout(() => this.dispose(message), delay).unref();
    }

    async onPortalRequest(event: Protocol.Fetch.RequestPausedEvent, path: string, cdp: CDPSession) {
        this.logger.debug('[Portal][Intercepted] ' + event.request.url);
        let psuri = this.context.portalSafeUniqueRequestId();
        this.context.psuriCache.set(psuri, { stack: this });

        try {
            return await this.preparePortalRequest(psuri, event, path, cdp);
        } catch (error) {
            this.context.psuriCache.delete(psuri);
            throw error;
        }
    }

    private async preparePortalRequest(
        psuri: string,
        event: Protocol.Fetch.RequestPausedEvent,
        path: string,
        cdp: CDPSession,
    ) {
        let postData = event.request.postData;
        if (event.request.hasPostData) {
            if (postData === undefined) {
                if (this.context.isDetourEnabled) {
                    this.logger.debug('[Portal][Detour too large] ' + event.request.url);
                    return this.context.portalRequestDetourToCatcher(psuri, event, path, cdp);
                }
                if (event.networkId === undefined) {
                    throw new Error('Portal request body is unavailable and detour handling is disabled.');
                }

                postData = (await cdp.send('Network.getRequestPostData', { requestId: event.networkId })).postData;
            }

            let contentType = '';
            for (let key of Object.keys(event.request.headers)) {
                if (key.toLowerCase() === 'content-type') {
                    contentType = event.request.headers[key].trim();
                }
            }
            if (contentType.startsWith('multipart/') && this.context.isDetourEnabled) {
                this.logger.debug('[Portal][Detour multipart] ' + event.request.url);
                return this.context.portalRequestDetourToCatcher(psuri, event, path, cdp);
            }
        }

        this.context.setPsuriHandler(
            psuri,
            async (failure, status, data, headers) =>
                (failure != null
                    ? cdp.send('Fetch.failRequest', {
                        requestId: event.requestId,
                        errorReason: failure.reason as Protocol.Network.ErrorReason,
                    })
                    : cdp.send('Fetch.fulfillRequest', {
                        requestId: event.requestId,
                        body: data,
                        responseCode: status,
                        responseHeaders: headers,
                    }))
                    .catch((error) => {
                        if (error instanceof TargetCloseError) return;
                        if (error instanceof ConnectionClosedError) return;
                        if (
                            error instanceof ProtocolError
                            && error.originalMessage.includes('Invalid InterceptionId')
                        ) {
                            this.logger.debug(
                                { psuri, url: event.request.url },
                                '[Portal][Canceled before response]',
                            );
                            return;
                        }
                        throw error;
                    }),
        );
        await this.handlePortalRequest({
            psuri,
            url: event.request.url,
            path,
            headers: event.request.headers,
            data: Buffer.from(postData ?? '', 'utf8').toString('base64'),
            method: event.request.method.toUpperCase(),
        });
    }

    portal: any = {
        initial: {
            call: null,
        },
        open: {
            response: null,
        },
        waiting: {
            response: null,
            call: false,
        },
        queue: {
            backlog: [
                //{request: 'test', promise: {resolve: null, reject: null}}
            ],
            active: [],
        },
    };

    // ! order of if statements is crucial - do not change
    public handlePortalRequest(request: PortalRequest) {
        this.logger.debug(`[handlePortalRequest] ${request.psuri} ${request.method} ${request.url}`);

        // queue active --> continue handling portal requests
        if (this.portal.queue.active.length > 0) {
            this.logger.debug('-> add portal request to active queue');
            this.portal.queue.active.push(request);
            return;
        }

        // queue inactive and no active call --> put in backlog
        if (this.activeCall == undefined) {
            this.logger.debug('-> add portal request to backlog queue');
            this.portal.queue.backlog.push(request);
            return;
        }

        // queue inactive and active call --> start handling queue
        this.portal.queue.active.push(request);
        this.logger.debug('-> add portal request to active queue');
        if (this.portal.queue.active.length === 1) {
            this.logger.debug('-> sending portal request while client request active');
            
            if (this.portal.open.response != null) {
                let res = this.portal.open.response;
                this.portal.open.response = undefined;
                
                return res.resolve(this.createServerRequest(this.portal.queue.active[0]))
            }
            
            return this.activeCall.resolve(this.createServerRequest(this.portal.queue.active[0]));
        }
    }

    public async handlePortalResponse(response: PortalResponse, res: any) {
        clearTimeout(this.portalTimeout);

        let current = this.portal.queue.active[0];
        if (current === undefined) {
            throw new Error(`Received portal response [${response.psuri}] but there is no active portal request.`);
        }
        if (current.psuri !== response.psuri) {
            throw new Error(
                `Portal response [${response.psuri}] does not match the active portal request [${current.psuri}].`,
            );
        }

        let body = response.body ?? '';
        this.logger.debug(
            {
                status: response.status,
                headers: response.headers,
                error: response.error,
                body: body.length > 500 ? body.length : body,
            },
            `[handlePortalResponse] ${response.psuri}`,
        );
        
        let cache = this.context.psuriCache.get(current.psuri);
        if (cache == undefined) {
            throw new Error('TODO');
        }
        if (cache.handler == undefined) {
            throw new Error('TODO');
        }
        this.context.psuriCache.delete(current.psuri);
        
        let headers: Protocol.Fetch.HeaderEntry[] = [];
        for (let header of Object.keys(response.headers ?? {})) {
            let values = response.headers[header];
            if (!Array.isArray(values)) values = [values];
            values.forEach((value: string) => headers.push({ name: header, value }));
        }
        this.logger.debug(
            { handler: cache?.handler.toString(), status: response?.status, body: body.length, headers },
            'dbg portal before handler',
        );

        // A failed delivery must not stop the queue, otherwise later requests would stay pending.
        const failure = resolvePortalFailure(response);
        try {
            await cache.handler(failure, response.status as number, body, headers);
        } catch (error) {
            this.logger.error({ error, psuri: response.psuri }, '[Portal] Could not deliver response');
            if (failure === undefined) {
                await this.deliverPortalFailure(cache.handler, { reason: 'Failed' });
            }
        }
        this.logger.debug('dbg portal after handler');

        this.portal.queue.active.shift();
        
        // queue not empty --> continue sending portal requests to client
        if (this.portal.queue.active.length !== 0) {
            this.logger.debug('dbg portal queue not empty - returning next active');
            return res.resolve(this.createServerRequest(this.portal.queue.active[0]));
        }
        
        // queue empty and response ready from the currently active call --> send that response to client
        if (this.portal.waiting.response != null) {
            this.logger.debug('dbg waiting for response - resolving');
            let waiting = this.portal.waiting.response;
            this.portal.waiting.response = null;
            
            this.lastCall = this.activeCall;
            this.activeCall = undefined;
            
            return res.resolve(waiting);
        }
        // queue empty and no response ready from the currently active call --> hold onto the current requests response handler
        if (this.activeCall != null) {
            this.logger.debug('dbg setting this.portal.open.response');
            this.portal.open.response = res;
            
            return;
            // return res.resolve(await new Promise((resolve, reject) => (this.lastCallerPromise = { resolve, reject })));
        }
        
        // queue empty and no active call (this can happen when the queue was started before a call in comparison to the queue starting while a call is active)
        this.logger.debug('dbg executing initial call - queue empty, executing initial call');
        this.portal.open.response = res;
        return this.call(this.portal.initial.call, true);
    }

    public createServerRequest(portalRequest: TODO) {
        // Once the request is handed over no connection is open, so a vanished client can only be noticed by timing out.
        clearTimeout(this.portalTimeout);
        this.portalTimeout = setTimeout(
            () => this.failPortalRequests('TimedOut', 'Timed out waiting for the client to answer a portal request.'),
            this.context.portalTimeout,
        );
        this.portalTimeout.unref();

        return Return.ServerRequest(portalRequest).serialize();
    }

    private async deliverPortalFailure(handler: TODO, failure: PortalFailure) {
        try {
            await handler(failure, 0, '', []);
        } catch (error) {
            this.logger.error({ error, failure }, '[Portal] Could not fail request');
        }
    }

    /**
     * Fails all portal work of this stack, for when no client can answer it anymore.
     */
    public failPortalRequests(reason: string, message: string) {
        clearTimeout(this.portalTimeout);

        for (const [psuri, cached] of this.context.psuriCache) {
            if (cached.stack === this) {
                this.context.psuriCache.delete(psuri);
                if (cached.handler !== undefined) {
                    void this.deliverPortalFailure(cached.handler, { reason, message });
                }
            }
        }

        this.portal.queue.active = [];
        this.portal.queue.backlog = [];
        this.portal.initial.call = null;

        // The active call already finished and only waited for the queue, so nothing else will release the client.
        if (this.portal.waiting.response != null) {
            const waiting = this.portal.waiting.response;
            this.portal.waiting.response = null;
            this.lastCall = this.activeCall;
            this.activeCall = undefined;
            this.portal.open.response?.resolve(waiting);
            this.portal.open.response = undefined;
        } else if (this.activeCall == null) {
            this.portal.open.response?.resolve({ type: 'error', code: 'PortalFailed', message });
            this.portal.open.response = undefined;
        }
    }

    /**
     * Drops a single request the browser gave up on. A request the client is already handling stays queued so its
     * answer keeps the queue moving, but that answer goes nowhere.
     */
    public cancelPortalRequest(psuri: string) {
        const { queue } = this.portal;
        const cached = this.context.psuriCache.get(psuri);

        if (queue.active[0]?.psuri === psuri) {
            if (cached !== undefined) {
                cached.handler = async () => {};
            }
            return;
        }

        queue.active = queue.active.filter((request: PortalRequest) => request.psuri !== psuri);
        queue.backlog = queue.backlog.filter((request: PortalRequest) => request.psuri !== psuri);
        this.context.psuriCache.delete(psuri);
    }

    /**
     * Called when the connection of a waiting client closes before it received its response.
     */
    public clientDisconnected(response: PromiseWithResolvers<unknown>) {
        if (this.portal.open.response === response) {
            this.portal.open.response = undefined;
        } else if (this.activeCall?.response !== response) {
            return;
        }

        this.failPortalRequests('Aborted', 'The client disconnected.');
    }

    async onDialogOpen(dialog: Dialog) {
        this.context.caches.dialog.set(this.page, dialog);
        
        if (this.activeCall == undefined) {
            return;
        }
        
        // if the dialog opened during an active portal queue but the active call already has a result --> skip dialog response
        if (this.portal.queue.active.length > 0 && this.portal.waiting.response != null) {
            return;
        }

        if (!dialogFunctions.includes(this.activeCall.packet.function)) {
            this.logger.debug(this.activeCall.packet, 'skipping active calls response because dialog opened');
            this.skipCallResponses.push(this.activeCall);

            this.logger.debug('Resolving active request because dialog opened on page.');
            await this.conclude(
                this.activeCall,
                Return.Dialog({
                    message: dialog.message(),
                    defaultValue: dialog.defaultValue(),
                    type: dialog.type(),
                }).serialize(),
                true,
            );

            return;
        }

        let waiters = this.context.waitingForDialog.filter((i) => i.page == this.page);
        this.context.waitingForDialog = this.context.waitingForDialog.filter((i) => i.page != this.page);

        if (waiters.length === 0) {
            // is this case possible?
            this.logger.error('Dialog opened during active call but no waiter was registered.');
            throw new Error('Dialog opened during active call but no waiter was registered.');
        }
        if (waiters.length > 1) {
            throw new Error('Multiple dialog waiters registered but there should only be one.');
        }

        // the active call is a dialog function so we continue that call
        await waiters[0].resolve(dialog);
    }

    get logger() {
        return this.context.puth.logger;
    }
}
