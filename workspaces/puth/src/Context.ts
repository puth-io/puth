import {v4} from 'uuid';
import {Dialog, Page, Target, ConsoleMessage, Browser as PPTRBrowser, BrowserContext, TargetCloseError, CDPSession} from 'puppeteer-core';
import Generic from './Generic';
import * as Utils from './Utils';
import { Puth } from './Puth';
import PuthContextPlugin from './PuthContextPlugin';
import {PUTH_EXTENSION_CODEC} from './handlers/WebsocketHandler';
import mitt, {Emitter, Handler, WildcardHandler} from './utils/Emitter';
import path, { join } from 'node:path';
import {encode} from '@msgpack/msgpack';
import {promises as fsPromise} from 'node:fs';
import { Return } from './context/Return';
import Constructors, {ConstructorValues} from './context/Constructors';
import {tmpdir} from 'node:os';
import {ContextStatus, ICommand, IExpectation} from '@puth/core';
import { Browser, ExpectationFailed } from './shims/Browser';
import { BrowserRefContext } from './handlers/BrowserHandler';
import {Protocol} from 'devtools-protocol';

const {writeFile, mkdtemp} = fsPromise;

type ContextEvents = {
    'call': any,
    'get': any,
    'set': any,
    'delete': any,
    'destroying',
    'browser:connected': {browser: PPTRBrowser},
    'browser:disconnected': {browser: PPTRBrowser},
    'page:created': {browser?: PPTRBrowser, browserContext: BrowserContext, page: Page},
    'page:closed': {browser: PPTRBrowser, page: Page},
    'call:apply:before': {command: ICommand|undefined, page: Page},
    'call:apply:after': {command: ICommand|undefined, page: Page},
    'call:apply:error': {error: any, command: ICommand|undefined, page: Page},
    'call:expectation:error': {expectation: IExpectation, command: ICommand|undefined, page: Page},
}

type ContextOptions = {
    debug: boolean|undefined;
    snapshot: boolean|undefined;
    test: {
        name: undefined|string;
        status: undefined|ContextStatus.FAILED|ContextStatus.SUCCESSFUL|ContextStatus.PENDING;
    };
    group: string|undefined;
    status: string|undefined;
    timeouts?: {
        command?: number;
    };
    dev: boolean|undefined;
    track: string[]|undefined;
}
type ContextCaches = {
    snapshot: {
        lastHtml: string;
    };
    dialog: Map<Page, Dialog>;
}

type PsuriResponseHandler = (
    error: undefined|{reason: string},
    status: number,
    data: string,
    headers: Protocol.Fetch.HeaderEntry[],
) => Promise<void>;

/**
 * @codegen
 */
class Context extends Generic {
    private readonly _id: string = v4();
    private readonly _type: string = 'Context';
    private readonly _puth: Puth;
    private readonly _emitter: Emitter<ContextEvents>;
    private readonly _createdAt: number;
    private _lastActivity: number;

    private options: ContextOptions;
    private plugins: PuthContextPlugin[] = [];
    private eventFunctions: [any, string, () => {}][] = [];
    private cleanupCallbacks: any = [];

    public caches: ContextCaches = {
        snapshot: {
            lastHtml: '',
        },
        dialog: new Map<Page, Dialog>(),
    };

    public shouldSnapshot: boolean = false;

    public test: {
        name: string;
        status: ContextStatus.FAILED|ContextStatus.SUCCESSFUL|ContextStatus.PENDING;
    } = {
        name: '',
        status: ContextStatus.PENDING,
    };

    public destroying: boolean = false;

    private lastCallerPromise?: {
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    };

    public browsers: BrowserRefContext[] = [];

    constructor(puth: Puth, options: any = {}) {
        super();

        this._puth = puth;
        this._emitter = mitt<ContextEvents>();
        this._createdAt = Date.now();
        this._lastActivity = this._createdAt;

        this.options = options;
        this.shouldSnapshot = this.options?.snapshot === true;

        this.test.name = options?.test?.name ?? '';

        if (this.shouldSnapshot) { // Track context creation
            this.puth.snapshotHandler.pushToCache(this, {
                ...this.serialize(), // TODO remove -> GUI needs to use packet.context
                context: this.serialize(),
                type: 'context',
                options: this.options,
                createdAt: this.createdAt,
                timestamp: Date.now(),
            });
        }
    }

    async setup() {
        for (let pluginClass of this.puth.contextPlugins) {
            let plugin = new pluginClass();
            await plugin.install(this);
            this.plugins.push(plugin);
        }
    }

    // public async connectBrowser(options): Promise<PPTRBrowser> {
    //     return await puppeteer.connect(options)
    //         .then(browser => this.handleNewBrowser(browser));
    // }

    public async createBrowserRef(options: any = {}): Promise<BrowserRefContext> {
        if (! options.executablePath && this.puth.installedBrowser?.executablePath) {
            options.executablePath = this.puth.installedBrowser.executablePath;
        }

        return await this.puth.browserHandler.launch(options, this)
            .then(rv => {
                this.browsers.push(rv);
                //         .then(() => this.emitter.emit('browser:connected', {browser}))
                return this.trackBrowser(rv.context).then(_ => rv);
            });
    }

    public async createBrowser(options: any = {}): Promise<BrowserContext> {
        return await this.createBrowserRef(options).then(({ref, context}) => context);
    }

    // @codegen
    public async createBrowserShim(options = {}, shimOptions = {}): Promise<Browser> {
        return await this.createBrowserRef(options)
            .then(brc => brc.context.pages()
                .then(pages => pages.length > 0 ? pages[0] : brc.context.newPage())
                .then(page => new Browser(brc, page, shimOptions))
            );
    }

    // // @codegen
    // public async createBrowserShimForPage(page: Page): Promise<Browser> {
    //     return new Browser(this, page);
    // }

    // when client call destroy() without 'immediately=true' we delay the actual destroy by destroyingDelay ms
    // this is to catch all screencast frames when the call ends too fast
    destroyingTimeout?: NodeJS.Timeout;
    public async destroy(options: any = {}) {
        if (! options?.immediately) {
            if (options == null) {
                options = {};
            }
            options.immediately = true;
            options.initiator = 'timeout';
            this.destroyingTimeout = setTimeout(() => this.destroy(options), 400);

            return false;
        }
        
        clearTimeout(this.destroyingTimeout);
        if (this.destroying) {
            return Promise.resolve();
        }
        this.destroying = true;

        if (this.test.status === ContextStatus.PENDING) { // succeed test if not defined by client
            this.testSuccess();
        }
        if (options?.save) {
            await this.saveContextSnapshot(options.save);
        }
        // unregister all event listeners
        this.eventFunctions.forEach(([page, event, func]) => {
            page.off(event, func);
        });

        this.puth.logger.debug(options, `context destroy`);
        return await Promise.all(this.browsers.map(rv => this.puth.browserHandler.destroy(rv)))
            .then(() => Promise.all(this.cleanupCallbacks))
            .then(() => true);
    }
    
    // TODO implement sending fatal message to connected client/or next incoming client request
    fatal(message: string): Promise<void> {
        return Promise.resolve();
    }

    // public async destroyBrowserByBrowser(browser) {
    //     return await browser.close()
    //         .then(() => this.removeBrowser(browser));
    // }

    public async destroyBrowserContext(brc: BrowserRefContext) {
        this.puth.logger.debug(`destroyBrowserContext`);
        return this.puth.browserHandler.destroy(brc);
    }

    // private removeBrowser(browser: PPTRBrowser) {
    //     this.browsers.splice(
    //         this.browsers.findIndex(b => b === browser),
    //         1,
    //     );
    // }

    waitingForDialog: {
        page: Page;
        resolve: (value: Dialog) => void;
        reject: (reason?: any) => void;
    }[] = [];

    isPageBlockedByDialog(page: Page): false|Dialog {
        let dialog = this.caches.dialog.get(page);
        if (dialog === undefined) {
            return false;
        }
        return dialog;
    }

    skipRunningCallResponse = false;
    async pageOnDialog(page, dialog) {
        this.caches.dialog.set(page, dialog);

        let waiters = this.waitingForDialog.filter(i => i.page == page);
        this.waitingForDialog = this.waitingForDialog.filter(i => i.page != page);

        // this.puth.logger.error(waiters, 'waiters');

        if (waiters.length === 0) {
            if (this.lastCallerPromise) {
                this.puth.logger.debug('Resolved active request because dialog opened on page.');
                let lcp = this.lastCallerPromise;
                this.lastCallerPromise = undefined;
                this.skipRunningCallResponse = true;

                lcp.resolve(Return.Dialog({
                    message: dialog.message(),
                    defaultValue: dialog.defaultValue(),
                    type: dialog.type(),
                }).serialize());
            }
        } else {
            for (let waiter of waiters) {
                waiter.resolve(dialog);
                // TODO possible race condition? await waiter.promise?
            }
        }
    }

    private async trackBrowser(browserContext: BrowserContext) {
        browserContext.once('disconnected', () => {
            this.puth.logger.debug('browserContext disconnected');
            this.removeEventListenersFrom(browserContext);
            // this.emitter.emit('browser:disconnected', {browser});
            // this.browsers = this.browsers.filter(b => b !== browser);
        });

        this.registerEventListenerOn(browserContext, 'targetcreated', async (target: Target) => {
            // TODO do we need to track more here? like 'browser' or 'background_page'...?
            if (target.type() === 'page') {
                let page = await target.page();
                await this.trackPage(page);
                // @ts-ignore
                this.emitter.emit('page:created', { browserContext, page});
                // @ts-ignore
                page.on('close', _ => this.emitter.emit('page:closed', { browser: browserContext, page}));
            }
        });

        // Track default browser page (there is no 'targetcreated' event for page[0])
        return await browserContext.pages()
            .then(async pages => {
                let page0 = pages[0];
                await this.trackPage(page0);
                this.emitter.emit('page:created', { browserContext, page: page0});
            });
    }

    /**
     * TODO maybe track "outgoing" navigation requests, and stall incoming request until finished loading
     *      but check if we need to make sure if call the object called on needs to be existing
     */
    private async trackPage(page) {
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        page.on('close', () => this.removeEventListenersFrom(page));
        page.on('dialog', (dialog: Dialog) => this.pageOnDialog(page, dialog));

        this.registerEventListenerOn(page, 'console', async (consoleMessage: ConsoleMessage) => {
            let args: any = [];

            args = await Promise.all(
                consoleMessage.args()
                    .map(
                        async (m) => await m.jsonValue()
                            .catch(err => {
                                if (err.name === 'TargetCloseError') {
                                    // TODO handle TargetCloseError
                                }

                                this.puth.logger.warn({
                                    exception: err,
                                    jsHandle: m,
                                }, 'Could not serialize args from console message');
                            }),
                    ),
            );

            this.puth.snapshotHandler.pushToCache(this, {
                id: v4(),
                type: 'log',
                context: this.serialize(),
                timestamp: Date.now(),
                messageType: consoleMessage.type(),
                args,
                location: consoleMessage.location(),
                text: consoleMessage.text(),
                stackTrace: consoleMessage.stackTrace(),
            });
        });

        if (this.options?.supports?.portal != null) {
            // await page.setRequestInterception(true);
            // this.registerEventListenerOn(page, 'request', async (request: HTTPRequest) => {
            //     // this.puth.logger.debug({method: request.method(), url: request.url(), data: request.postData(), isNavigationRequest: request.isNavigationRequest()}, 'request');
            //     return this.handlePortalRequest(request, this.options?.supports?.portal?.urlPrefixes ?? []);
            // });

            let cdp = await this.cdps(page);
            cdp.on('Fetch.requestPaused', event => {
                let path = this.portalShouldHandleRequest(event);
                if (path === false) {
                    return cdp.send('Fetch.continueRequest', {requestId: event.requestId});
                }

                this.puth.logger.debug('[Portal][Intercepted] ' + event.request.url);
                let psuri = this.portalSafeUniqueRequestId();
                this.psuriCache.set(psuri, { page });

                if (event.request.hasPostData) {
                    if (event.request.postData === undefined) {
                        this.puth.logger.debug('[Portal][Detour too large] ' + event.request.url);
                        return this.portalRequestDetourToCatcher(psuri, event, path, cdp);
                    }

                    let contentType = '';
                    for (let key of Object.keys(event.request.headers)) {
                        if (key.toLowerCase() === 'content-type') {
                            contentType = event.request.headers[key].trim();
                        }
                    }
                    if (contentType.startsWith('multipart/')) {
                        this.puth.logger.debug('[Portal][Detour multipart] ' + event.request.url);
                        return this.portalRequestDetourToCatcher(psuri, event, path, cdp);
                    }
                }

                this.setPsuriHandler(
                    psuri,
                    // TODO handle portal network error - Fetch.failRequest
                    async (error, status, data, headers) =>
                        cdp
                            .send('Fetch.fulfillRequest', {
                                requestId: event.requestId,
                                body: btoa(data),
                                responseCode: status,
                                responseHeaders: headers,
                            })
                            .catch((error) => {
                                if (error instanceof TargetCloseError) return;
                                throw error;
                            }),
                );
                this.handlePortalRequest({
                    psuri,
                    url: event.request.url,
                    path,
                    headers: event.request.headers,
                    data: btoa(event.request.postData ?? ''),
                    method: event.request.method.toUpperCase(),
                });
            });
            await cdp.send('Fetch.enable');
        }
    }

    private portalShouldHandleRequest({request, resourceType}: Protocol.Fetch.RequestPausedEvent): false|string {
        let prefixes = this.options?.supports?.portal?.urlPrefixes;
        if (prefixes == null || !Array.isArray(prefixes)) {
            return false;
        }

        let url = request.url;
        // TODO add option for clients ignore intercepted requests
        // if (['Script', 'Stylesheet', 'Font'].includes(resourceType)
        //     || !['Document', 'Other'].includes(resourceType)
        //     || url.endsWith('.ico')) {
        //     this.puth.logger.debug(`[Portal][Skip ${resourceType}] ${url.substring(0, 80)}`);
        //     return false;
        // }

        for (let prefix of prefixes) {
            if (url.startsWith(prefix)) {
                return url.replace(prefix, '');
            }
        }

        return false;
    }

    psuriCache: Map<string, {
        page: Page;
        handler?: PsuriResponseHandler;
    }> = new Map();

    public setPsuriHandler(psuri: string, handler: PsuriResponseHandler) {
        let cache = this.psuriCache.get(psuri);
        if (cache == null) {
            throw new Error('Unreachable'); // TODO better error
        }

        cache.handler = handler;
        this.psuriCache.set(psuri, cache);
    }

    public handlePortalRequest(
        request: {
            psuri: string;
            url: string;
            path: string;
            headers: TODO;
            data: string;
            method: string;
        }
    ) {
        this.puth.logger.debug(`[handlePortalRequest] ${request.psuri} ${request.method} ${request.url}`);

        if (this.portal.queue.active.length > 0) {
            this.puth.logger.debug('-> add portal request to active queue');
            this.portal.queue.active.push(request);
            return;
        }

        if (this.lastCallerPromise == null) {
            this.puth.logger.debug('-> add portal request to backlog queue');
            this.portal.queue.backlog.push(request);
            return;
        }

        this.portal.queue.active.push(request);
        this.puth.logger.debug('-> add portal request to active queue');
        if (this.portal.queue.active.length === 1) {
            this.puth.logger.debug('-> sending portal request while client request active');
            let lcp = this.lastCallerPromise;
            this.lastCallerPromise = undefined;
            return lcp.resolve(
                this.createServerRequest(this.portal.queue.active[0])
            );
        }
    }

    private portalRequestDetourToCatcher(psuri: string, {requestId, request}: Protocol.Fetch.RequestPausedEvent, path: string, cdp: CDPSession) {
        let headers: Protocol.Fetch.HeaderEntry[] = [];
        for (let key of Object.keys(request.headers)) {
            headers.push({name: key, value: request.headers[key]});
        }
        headers.push({name: 'puth-portal-context-id', value: this.id});
        headers.push({name: 'puth-portal-psuri', value: psuri});
        headers.push({name: 'puth-portal-url', value: encodeURI(request.url)});
        headers.push({name: 'puth-portal-path', value: encodeURI(path)});

        let addr = this.puth.http.url;
        if (addr == undefined) {
            throw new Error('Unreachable');
        }

        return cdp.send('Fetch.continueRequest', {
            requestId,
            url: join(addr, 'portal/detour'),
            headers,
        });
    }

    portalRequestCounter = 0;
    private portalSafeUniqueRequestId(): string {
        this.portalRequestCounter++;
        return this.portalRequestCounter.toString();
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
    }

    public async handlePortalResponse(data, res) {
        let body = atob(data.response.body);
        this.puth.logger.debug({
            status: data.response.status,
            contentType: data.response.contentType,
            headers: data.response.headers,
            body: body.length > 500 ? body.length : body,
        }, `[handlePortalResponse] ${data.response.psuri}`);

        let current = this.portal.queue.active[0];

        let cache = this.psuriCache.get(current.psuri);
        if (cache == undefined) {
            throw new Error('TODO');
        }
        if (cache.handler == undefined) {
            throw new Error('TODO');
        }
        this.psuriCache.delete(current.psuri);

        let headers: Protocol.Fetch.HeaderEntry[] = [];
        for (let header of Object.keys(data.response.headers)) {
            let values = data.response.headers[header];
            if (!Array.isArray(values)) values =  [values];
            values.forEach(value => headers.push({name: header, value}));
        }
        this.puth.logger.debug({cache, handler: cache?.handler.toString(), status: data?.response?.status, body: body.length, headers}, 'dbg portal before handler');
        await cache.handler(undefined, data.response.status, body, headers);
        this.puth.logger.debug('dbg portal after handler');

        this.portal.queue.active.shift();
        if (this.portal.queue.active.length !== 0) {
            this.puth.logger.debug('dbg portal queue not empty - returning next active');
            return res.resolve(this.createServerRequest(this.portal.queue.active[0]));
        }
        if (this.portal.waiting.response != null) {
            this.puth.logger.debug('dbg waiting for response - resolving');
            let waiting = this.portal.waiting.response;
            this.portal.waiting.response = null;
            return res.resolve(waiting);
        }
        if (this.portal.waiting.call) {
            this.puth.logger.debug('dbg resetting waiting call');
            return res.resolve(await new Promise((resolve, reject) => this.lastCallerPromise = {resolve, reject}));
        }

        this.puth.logger.debug('dbg executing initial call - skipping queue');
        return this.call(this.portal.initial.call, res, true);
    }

    public createServerRequest(portalRequest) {
        return Return.ServerRequest(portalRequest).serialize();
    }

    private pageCDPSessions: Map<Page, WeakRef<CDPSession>> = new Map();
    private async cdps(page: Page): Promise<CDPSession> {
        if (this.pageCDPSessions.has(page)) {
            let found = this.pageCDPSessions.get(page)?.deref();
            if (found !== undefined) {
                return Promise.resolve(found);
            }
        }

        let session = await page.createCDPSession();
        this.pageCDPSessions.set(page, new WeakRef<CDPSession>(session));
        return session;
    }

    // @codegen
    // @gen-returns any[]
    public getSnapshotsByType(type): Return { // used by clients
        return Return.Values(this.puth.snapshotHandler.getAllCachedItemsFrom(this).filter(item => item?.type === type));
    }

    registerEventListenerOn(object, event, func) {
        this.eventFunctions.push([object, event, func]);
        object.on(event, func);
    }

    removeEventListenersFrom(object) {
        let listeners = this.eventFunctions.filter((listener) => listener[0] === object);
        listeners.forEach(([page, event, func]) => {
            page.off(event, func);
        });

        this.eventFunctions = this.eventFunctions.filter((listener) => listener[0] !== object);
    }

    // @codegen
    public testFailed() { // used by clients
        this.test.status = ContextStatus.FAILED;

        if (this.shouldSnapshot) {
            this.puth.snapshotHandler.pushToCache(this, {
                type: 'test',
                specific: 'status',
                status: ContextStatus.FAILED,
                context: this.serialize(),
                timestamp: Date.now(),
            });
        }
    }

    // @codegen
    public testSuccess() {
        this.test.status = ContextStatus.SUCCESSFUL;

        if (this.shouldSnapshot) {
            this.puth.snapshotHandler.pushToCache(this, {
                type: 'test',
                specific: 'status',
                status: ContextStatus.SUCCESSFUL,
                context: this.serialize(),
                timestamp: Date.now(),
            });
        }
    }

    // @codegen
    public testSucceeded() {
        return this.testSuccess();
    }

    async saveContextSnapshot(options) {
        let {to} = options;

        if (to === 'file') {
            let {location} = options;
            let storagePath;

            if (! location) {
                location = path.join('storage', 'snapshots');
            }
            if (! Array.isArray(location)) {
                location = [location];
            }

            storagePath = path.join(process.cwd(), ...location, `snapshot-${this.createdAt}-${this.id}.puth`);

            return await writeFile(
                storagePath,
                encode(this.puth.snapshotHandler.getAllCachedItemsFrom(this), {extensionCodec: PUTH_EXTENSION_CODEC}),
            );
        }
    }

    private async createCommandInstance(packet, on): Promise<ICommand|undefined> {
        if (! this.shouldSnapshot) {
            return;
        }
        const now = Date.now();

        return {
            id: v4(),
            type: 'command',
            snapshots: {
                before: undefined,
                after: undefined,
            },
            errors: [],
            context: this.serialize(),
            func: packet.function,
            args: packet.parameters,
            on: {
                type: Utils.resolveConstructorName(on),
                path: await Utils.getAbsolutePaths(on),
            },
            time: {
                elapsed: now - this.createdAt,
                started: now,
                finished: 0,
            },
            timestamp: now,
        };
    }

    // public async callAll(calls) {
    //     return Promise.all(calls.map(call => this.call(call)));
    // }
    //
    // public async callAny(calls) {
    //     return [await Promise.any(calls.map(call => this.call(call)))];
    // }
    //
    // public async callRace(calls) {
    //     return [await Promise.race(calls.map(call => this.call(call)))];
    // }

    public async call(packet, res, skipQueue = false) {
        this.puth.logger.debug(packet, 'Context call');
        this._lastActivity = Date.now();

        if (!skipQueue && this.portal.queue.backlog.length !== 0) {
            this.puth.logger.debug('offsetting packet...');
            this.portal.initial.call = packet;
            this.portal.queue.active = this.portal.queue.backlog;
            this.portal.queue.backlog = [];

            return res.resolve(this.createServerRequest(this.portal.queue.active[0]));
        }

        this.portal.open.response = res;

        let on = this.resolveOn(packet);
        // it's hideous, but it's better than 3 deep ifs imho
        let page =
            (on instanceof Page)
                ? on
                : (on instanceof Browser)
                    ? on.site
                    : (Utils.resolveConstructorName(on) === Constructors.Page
                        ? on
                        : on?.frame?.page());

        if (page && this.isPageBlockedByDialog(page) && (on instanceof Browser && !['assertDialogOpened', 'typeInDialog', 'acceptDialog', 'dismissDialog', 'waitForDialog'].includes(packet.function))) {
            return Return.ExpectationFailed('The page has an open dialog that blocks all function calls except those that interact with it.').serialize();
        }

        // Turn object representations into the actual object
        packet.parameters = packet.parameters ? packet.parameters.map((item) => this.resolveIfCached(item)) : [];

        let type = Utils.resolveConstructorName(on);
        if (type) {
            // check for extension
            let extension = this.getPlugins().find((ext) => ext.hasAddition(type, packet.function));
            if (extension) {
                let addition = extension.getAddition(type, packet.function);

                if (typeof addition === 'function') {
                    addition = {func: addition};
                }

                // Call extension function and pass object as first parameter
                return res.resolve(await this.handleCallApply(
                    packet,
                    page,
                    extension,
                    addition.func,
                    [on, ...packet.parameters],
                    addition.expects,
                ));
            }
        }

        if (! on[packet.function]) {
            return {
                type: 'error',
                code: 'FunctionNotFound',
                message: `Function "${packet.function}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }

        return res.resolve(await this.handleCallApply(packet, page, on, on[packet.function], packet.parameters));
    }

    // TODO Cleanup parameters and maybe unify handling in special object
    private async handleCallApply(packet, page, on, func, parameters, expects = null) {
        const command = await this.createCommandInstance(packet, on);
        if (this.caches.dialog.size === 0) {
            // await this.puth.snapshotHandler.createBefore(this, page, command);
        }

        this.portal.initial.call = null;
        this.portal.waiting.call = true;

        let p = new Promise((resolve, reject) => this.lastCallerPromise = {resolve, reject});

        this.emitAsync('call:apply:before', {command, page})
            .then(async () => {
                try {
                    // @ts-ignore
                    let returnValue = await Promise.try(func.bind(on, ...parameters))
                        .catch((error) => {
                            // TODO handle puppeteer errors - should also be used when snapshotting
                            if (error instanceof TargetCloseError) {
                                this.puth.logger.error('TargetCloseError');
                                return;
                            }
                            if (error.message.includes('Attempted to use detached Frame')) {
                                this.puth.logger.error('Attempted to use detached Frame');
                                return;
                            }
                            if (error.message.includes('Execution context was destroyed')) {
                                this.puth.logger.error('Execution context was destroyed');
                                return;
                            }

                            // this.puth.logger.debug('handleCallApply throwing');
                            // TODO test if try also catches promise errors without this throw
                            throw error;
                        });

                    if (command) {
                        command.time.finished = Date.now();
                        command.time.took = command.time.finished - command.time.started;
                    }

                    let response = await this.handleCallApplyAfter(packet, page, command, returnValue, expects, on);

                    if (this.portal.queue.active.length !== 0) {
                        this.puth.logger.debug('set waiting response');
                        this.portal.waiting.response = response;
                        this.portal.waiting.call = false;

                        return;
                    }

                    if (this.lastCallerPromise == null) {
                        if (this.skipRunningCallResponse) {
                            this.skipRunningCallResponse = false;
                            this.portal.waiting.call = false;
                            return;
                        }

                        this.puth.logger.error(packet, 'Unexpected empty lastCallerPromise')
                        throw new Error('Unexpected empty lastCallerPromise');
                    }
                    let lcp = this.lastCallerPromise;
                    this.lastCallerPromise = undefined;
                    this.portal.waiting.call = false;
                    lcp.resolve(response);
                } catch (error: any) {
                    this.puth.logger.debug(error, '[Call apply error]')
                    // call event before any pushToCache call
                    await this.emitAsync('call:apply:error', {error, command, page});

                    if (this.shouldSnapshot && command) {
                        command.time.finished = Date.now();
                        command.time.took = command.time.finished - command.time.started;

                        this.puth.snapshotHandler.error(this, page, command, {
                            type: 'error',
                            specific: 'apply',
                            error: {
                                message: error.message,
                                name: error.name,
                                stack: error.stack,
                            },
                            time: Date.now(),
                        });
                        this.puth.snapshotHandler.pushToCache(this, command);
                    }

                    let response =
                        error instanceof ExpectationFailed
                            ? error.getReturnInstance().serialize()
                            : {
                                  type: 'error',
                                  code: 'MethodException',
                                  message: `Function ${packet.function} threw error: ${error.message}`,
                                  error,
                              };
                    if (this.portal.queue.active.length != 0) {
                        this.puth.logger.debug('set waiting response');
                        this.portal.waiting.response = response;
                        this.portal.waiting.call = false;

                        return;
                    }

                    if (this.lastCallerPromise == null) {
                        if (this.skipRunningCallResponse) {
                            this.skipRunningCallResponse = false;
                            this.portal.waiting.call = false;
                            return;
                        }

                        this.puth.logger.error(packet, 'Unexpected empty lastCallerPromise')
                        throw new Error('Unexpected empty lastCallerPromise');
                    }
                    let lcp = this.lastCallerPromise;
                    this.lastCallerPromise = undefined;
                    this.portal.waiting.call = false;
                    lcp.resolve(response);
                }
            });
            // .finally(() => this.portal.waiting.call = false);

        return p;
    }

    private async handleCallApplyAfter(packet, page, command, returnValue, expectation, on) {
        let beforeReturn = async () => {
            await this.emitAsync('call:apply:after', {command, page});

            // TODO Implement this in events. Event: 'function:call:return'
            this.puth.snapshotHandler.pushToCache(this, command);
        };

        if (expectation != null) {
            if (expectation.test && ! expectation.test(returnValue)) {
                // call event before any pushToCache call
                await this.emit('call:expectation:error', {expectation, command, page});

                if (this.shouldSnapshot) {
                    this.puth.snapshotHandler.error(this, page, command, {
                        type: 'expectation',
                        expectation,
                        time: Date.now(),
                    });
                    this.puth.snapshotHandler.pushToCache(this, command);
                }

                return {
                    type: 'error',
                    code: 'expectationFailed',
                    message: expectation.message,
                };
            }

            if ('return' in expectation) {
                await beforeReturn();

                return expectation.return(returnValue);
            }

            if (expectation.returns) {
                await beforeReturn();

                let {type, represents} = expectation.returns;
                return this.returnCached(returnValue, type, represents);
            }
        }

        await beforeReturn();

        return this.resolveReturnValue(packet, returnValue, on);
    }

    // TODO add return value resolver structure
    resolveReturnValue(action, returnValue, on) {
        if (returnValue === on) {
            return Return.Self().serialize();
        }
        if (returnValue === null) {
            return Return.Null().serialize();
        }
        if (returnValue instanceof Return) {
            return returnValue.serialize();
        }
        if (ArrayBuffer.isView(returnValue) && Object.prototype.toString.call(returnValue) !== "[object DataView]") {
            return returnValue;
        }
        if (Array.isArray(returnValue)) {
            if (returnValue.length === 0) {
                return Return.Values(returnValue).serialize();
            }

            // This is also true if the return value content is an associative array
            // TODO implement deep lookup which caches only needed cacheable objects
            //      problem is, if you return mixed content, values and reference objects together,
            //      then the content is not naturally resolvable for the client
            if (Utils.resolveConstructorName(returnValue[0]) === 'Object') {
                return Return.Value(returnValue).serialize();
            }

            return Return.Array(returnValue.map(rv => this.resolveReturnValue(action, rv, on))).serialize();
        }
        if (this.isValueSerializable(returnValue)) {
            return Return.Value(returnValue).serialize();
        }
        if (returnValue?.type === 'PuthAssertion') {
            return returnValue;
        }

        let constructor = Utils.resolveConstructorName(returnValue);
        if (constructor) {
            if (constructor === 'Object') {
                if (this.isObjectSerializable(returnValue)) {
                    return Return.Value(returnValue).serialize();
                }
            }

            return this.returnCached(returnValue);
        }

        return Return.Undefined().serialize();
    }

    isObjectSerializable(object) {
        for (let key of Object.keys(object)) {
            if (! this.isValueSerializable(object[key])) {
                return false;
            }
        }

        return true;
    }

    isValueSerializable(value) {
        return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number';
    }

    public async get(action) {
        this._lastActivity = Date.now();

        let on = this.resolveOn(action);
        let resolvedTo = on[action.property];

        if (resolvedTo === undefined) {
            if ([Constructors.ElementHandle, Constructors.JSHandle].includes(Utils.resolveConstructorName(on))) {
                resolvedTo = await (
                    await on.evaluateHandle((handle, property) => handle[property], action.property)
                ).jsonValue();
            }
        }
        // if still undefined, return undefined exception
        if (resolvedTo === undefined) {
            return {
                type: 'error',
                code: 'Undefined',
                message: `Property "${action.property}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }

        if (ConstructorValues.includes(Utils.resolveConstructorName(resolvedTo))) {
            return this.returnCached(resolvedTo);
        }

        return Return.Value(resolvedTo).serialize();
    }

    public async set(action) {
        this._lastActivity = Date.now();

        let on = this.resolveOn(action);
        let {property, value} = action;

        try {
            on[property] = value;
        } catch (error) {
            return {
                type: 'error',
                code: 'Undefined',
                message: `Property ${action.property} could not be set on ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }
    }

    public async delete(action) {
        this._lastActivity = Date.now();

        let on = this.resolveOn(action);

        try {
            delete on[action.property];
        } catch (error) {
            return {
                type: 'error',
                code: 'Undefined',
                message: `Property ${action.property} could not be deleted ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }
    }

    // Used by clients to upload temporary files to the server so that the browser can access them
    // @codegen
    public async saveTemporaryFile(name, content): Promise<string> {
        let tmpPath = await mkdtemp(path.join(tmpdir(), 'puth-tmp-file-'));
        let tmpFilePath = path.join(tmpPath, name);

        await writeFile(tmpFilePath, content, {encoding: 'base64'});
        this.cleanupCallbacks.push(async () => fsPromise.rm(tmpPath, {force: true, recursive: true}));

        return tmpFilePath;
    }

    resolveOn(representation): Context|any {
        let on = this;

        if (representation.type && representation.type !== this.type) {
            on = this.getCache(representation.type)[representation.id];
        }

        if (this.options?.debug) {
            this.puth.logger.debug({representation}, `[resolveOn] ${Utils.resolveConstructorName(on)} ${representation.function ?? representation.property} ${JSON.stringify(representation.parameters) ?? ''}`);
        }

        return on;
    }

    resolveIfCached(representation) {
        if (representation?.id && representation?.type) {
            return this.getCache(representation.type)[representation.id];
        }

        return representation;
    }

    public serialize() {
        return {
            id: this.id,
            type: this.type,
            represents: 'PuthContext',
            test: this.test,
            group: this.getGroup(),
        };
    }

    get id() {
        return this._id;
    }

    get type() {
        return this._type;
    }

    get emitter() {
        return this._emitter;
    }

    get puth() {
        return this._puth;
    }

    get createdAt() {
        return this._createdAt;
    }

    get lastActivity() {
        return this._lastActivity;
    }

    getGroup() {
        return this.options?.group ?? '';
    }

    getPuth(): Puth {
        return this.puth;
    }

    getPlugins(): PuthContextPlugin[] {
        return this.plugins;
    }

    getTimeout(options?) {
        if (options?.timeout != null) {
            return options.timeout;
        }

        return this.options?.timeouts?.command ?? 30 * 1000;
    }

    on<Key extends keyof ContextEvents>(type: Key, handler: Handler<ContextEvents[Key]>): void;
    on(type: '*', handler: WildcardHandler<ContextEvents>): void;
    on(type, handler) {
        return this.emitter.on(type, handler);
    }

    off<Key extends keyof ContextEvents>(type: Key, handler: Handler<ContextEvents[Key]>): void;
    off(type: '*', handler: WildcardHandler<ContextEvents>): void;
    off(type, handler) {
        return this.emitter.off(type, handler);
    }

    emit<Key extends keyof ContextEvents>(type: Key, event: ContextEvents[Key]): void;
    emit<Key extends keyof ContextEvents>(type: undefined extends ContextEvents[Key] ? Key : never): void;
    emit(type, event?) {
        return this.emitter.emit(type, event);
    }

    async emitAsync<Key extends keyof ContextEvents>(type: Key, event: ContextEvents[Key]): Promise<void>;
    async emitAsync<Key extends keyof ContextEvents>(type: undefined extends ContextEvents[Key] ? Key : never): Promise<void>;
    async emitAsync(type, event?) {
        return this.emitter.emitAsync(type, event);
    }
}

export default Context;
