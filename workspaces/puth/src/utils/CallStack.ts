// @ts-ignore
import { CDPSession, ConnectionClosedError, Dialog, Page, type Protocol, TargetCloseError } from 'puppeteer-core';
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

export type PortalResponse = {
    psuri: string;
    type: string;
    headers: TODO;
    body: string;
    status: number;
};

export class CallStack {
    private context: Context;
    private page: Page;

    activeCall?: Call;
    lastCall?: Call;

    skipCallResponses: Call[] = [];

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
        this.logger.debug(call?.packet, 'conclude');
        if (call != undefined && !force && this.portal.queue.active.length !== 0) {
            this.logger.debug('set waiting response');
            this.portal.waiting.response = result;
            // this.portal.waiting.call = false;

            return;
        }
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

    async onPortalRequest(event: Protocol.Fetch.RequestPausedEvent, path: string, cdp: CDPSession) {
        this.logger.debug('[Portal][Intercepted] ' + event.request.url);
        let psuri = this.context.portalSafeUniqueRequestId();
        this.context.psuriCache.set(psuri, { stack: this });
        
        this.logger.debug('[Portal][Detour] ' + event.request.url);
        return this.context.portalRequestDetourToCatcher(psuri, event, path, cdp);

        // if (event.request.hasPostData) {
        //     if (event.request.postData === undefined) {
        //         this.logger.debug('[Portal][Detour too large] ' + event.request.url);
        //         return this.context.portalRequestDetourToCatcher(psuri, event, path, cdp);
        //     }
        //
        //     let contentType = '';
        //     for (let key of Object.keys(event.request.headers)) {
        //         if (key.toLowerCase() === 'content-type') {
        //             contentType = event.request.headers[key].trim();
        //         }
        //     }
        //     if (contentType.startsWith('multipart/')) {
        //         this.logger.debug('[Portal][Detour multipart] ' + event.request.url);
        //         return this.context.portalRequestDetourToCatcher(psuri, event, path, cdp);
        //     }
        // }
        //
        // this.context.setPsuriHandler(
        //     psuri,
        //     // TODO handle portal network error - Fetch.failRequest
        //     async (error, status, data, headers) =>
        //         cdp
        //             .send('Fetch.fulfillRequest', {
        //                 requestId: event.requestId,
        //                 body: data,
        //                 responseCode: status,
        //                 responseHeaders: headers,
        //             })
        //             .catch((error) => {
        //                 if (error instanceof TargetCloseError) return;
        //                 if (error instanceof ConnectionClosedError) return;
        //                 throw error;
        //             }),
        // );
        // await this.handlePortalRequest({
        //     psuri,
        //     url: event.request.url,
        //     path,
        //     headers: event.request.headers,
        //     data: btoa(event.request.postData ?? ''),
        //     method: event.request.method.toUpperCase(),
        // });
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
        let body = response.body;
        this.logger.debug(
            {
                status: response.status,
                headers: response.headers,
                body_length: body.length,
            },
            `[handlePortalResponse] ${response.psuri}`,
        );
        
        let current = this.portal.queue.active[0];
        
        let cache = this.context.psuriCache.get(current.psuri);
        if (cache == undefined) {
            throw new Error('TODO');
        }
        if (cache.handler == undefined) {
            throw new Error('TODO');
        }
        this.context.psuriCache.delete(current.psuri);
        
        let headers: Protocol.Fetch.HeaderEntry[] = [];
        for (let header of Object.keys(response.headers)) {
            let values = response.headers[header];
            if (!Array.isArray(values)) values = [values];
            values.forEach((value: string) => headers.push({ name: header, value }));
        }
        this.logger.debug(
            { handler: cache?.handler.toString(), status: response?.status, body: body.length, headers },
            'dbg portal before handler',
        );
        await cache.handler(undefined, response.status, body, headers);
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
        return Return.ServerRequest(portalRequest).serialize();
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
