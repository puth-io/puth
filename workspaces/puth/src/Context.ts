import {v4} from 'uuid';
import {
    Dialog,
    Page,
    Target,
    ConsoleMessage,
    Browser as PPTRBrowser,
    BrowserContext,
    TargetCloseError,
    CDPSession,
    HTTPRequest,
    HTTPResponse,
} from 'puppeteer-core';
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
import { CallStack, PortalRequest, PortalResponse } from './utils/CallStack';
import { Call } from './utils/Call';

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

    lastCallerPromise?: {
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
        this.shouldSnapshot = this.options?.snapshot === true || this.debug;

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
    public async createBrowserShim(options: {} = {}, shimOptions: {} = {}): Promise<Browser> {
        return await this.createBrowserRef(options)
            .then(brc => brc.context.pages()
                .then(pages => pages.length > 0 ? pages[0] : brc.context.newPage())
                .then(page => new Browser(brc, page, shimOptions))
            );
    }

    // public async createBrowserShimForPage(page: Page): Promise<Browser> {
    //     return new Browser(this, page);
    // }
    
    destroyingTimeout?: NodeJS.Timeout;
    
    // when client call destroy() without 'immediately=true' we delay the actual destroy by destroyingDelay ms
    // this is to catch all screencast frames when the call ends too fast
    // @codegen
    public async destroy(options: any = {}): Promise<boolean> {
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
            return Promise.resolve(true);
        }
        this.destroying = true;

        if (this.test.status === ContextStatus.PENDING) { // succeed test if not defined by client
            this.testSuccess();
        }
        if (options?.save) {
            await this.saveContextSnapshot(options.save);
        } else if (this.debug) {
            await this.saveContextSnapshot({to: 'file'});
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
    
    public async capturePageScreenshot(browser: Browser, initiator?: string) {
        let screenshot = await browser.page.screenshot({type: 'jpeg', quality: 75});
        
        this.puth.snapshotHandler.pushToCache(this, {
            id: v4(),
            type: 'screencasts',
            version: 1,
            context: this.serialize(),
            timestamp: Date.now(),
            page: {
                // index: pageIdx,
                url: browser.page.url(),
                viewport: browser.page.viewport(),
            },
            browser: {
                // index: browserIdx,
                index: 0,
            },
            frame: screenshot,
            initiator,
        });
    }

    // private removeBrowser(browser: PPTRBrowser) {
    //     this.browsers.splice(
    //         this.browsers.findIndex(b => b === browser),
    //         1,
    //     );
    // }

    waitingForDialog: {
        page: Page;
        resolve: (value: Dialog) => Promise<void>;
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
    skipCallResponses = [];
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
                // @ts-ignore
                let page: Page = await target.page();
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
    private async trackPage(page: Page) {
        let stack = this.callStacks.get(page);
        if (stack == null) {
            stack = new CallStack(this, page);
            this.callStacks.set(page, stack);
        }
        
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        page.on('close', () => this.removeEventListenersFrom(page));
        page.on('dialog', (dialog: Dialog) => stack.omDialogOpen(dialog));

        this.registerEventListenerOn(page, 'console', async (consoleMessage: ConsoleMessage) => {
            let args = await Promise.all(
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
            let cdp: CDPSession = await this.cdps(page);
            cdp.on('Fetch.requestPaused', event => {
                let path = this.portalShouldHandleRequest(event);
                if (path === false) {
                    return cdp.send('Fetch.continueRequest', {requestId: event.requestId});
                }
                stack.onPortalRequest(event, path, cdp);
            });
            await cdp.send('Fetch.enable');
        }
        
        if (this.debug) {
            let trackable = (request: HTTPRequest) => ['document', 'stylesheet', 'image', 'media', 'font', 'script', 'manifest', 'xhr', 'fetch'].includes(request.resourceType());
            
            this.registerEventListenerOn(page, 'request', async (request: HTTPRequest) => {
                if (trackable(request)) {
                    this.puth.snapshotHandler.pushToCache(this, {
                        id: v4(),
                        type: 'request',
                        context: this.serialize(),
                        // @ts-ignore
                        time: Date.now(),
                        isNavigationRequest: request.isNavigationRequest(),
                        url: request.url(),
                        resourceType: request.resourceType(),
                        method: request.method(),
                        headers: request.headers(),
                        status: 'pending',
                    });
                }
            });
            
            this.registerEventListenerOn(page, 'requestfailed', async (request: HTTPRequest) => {
                if (trackable(request)) {
                    this.puth.snapshotHandler.pushToCache(this, {
                        id: v4(),
                        type: 'update',
                        specific: 'request.failed',
                        status: 'failed',
                        context: this.serialize(),
                        // @ts-ignore
                        url: request.url(),
                        time: Date.now(),
                    });
                }
            });
            
            this.registerEventListenerOn(page, 'response', async (response: HTTPResponse) => {
                if (trackable(response.request())) {
                    this.puth.snapshotHandler.pushToCache(this, {
                        id: v4(),
                        type: 'response',
                        context: this.serialize(),
                        // @ts-ignore
                        time: {
                            elapsed: Date.now() - this.createdAt,
                            finished: Date.now(),
                        },
                        status: response.status(),
                        url: response.request().url(),
                        resourceType: response.request().resourceType(),
                        method: response.request().method(),
                        headers: response.headers(),
                        content: await response.buffer().catch((err) => {
                            // Error occurs only when page is navigating. So if the response is coming in after page is already
                            // navigating to somewhere else, then chrome deletes the data.
                            return Buffer.alloc(0);
                        }),
                    });
                }
            });
        }
    }

    private portalShouldHandleRequest({request, resourceType}: Protocol.Fetch.RequestPausedEvent): false|string {
        let prefixes = this.options?.supports?.portal?.urlPrefixes;
        if (prefixes == null || !Array.isArray(prefixes)) {
            return false;
        }

        let url = request.url;
        for (let prefix of prefixes) {
            if (url.startsWith(prefix)) {
                return url.replace(prefix, '');
            }
        }

        return false;
    }

    psuriCache: Map<string, {
        stack: CallStack;
        handler?: PsuriResponseHandler;
    }> = new Map();
    
    portalRequestCounter = 0;
    public portalSafeUniqueRequestId(): string {
        this.portalRequestCounter++;
        return this.portalRequestCounter.toString();
    }

    public setPsuriHandler(psuri: string, handler: PsuriResponseHandler) {
        let cache = this.psuriCache.get(psuri);
        if (cache == null) {
            throw new Error('Unreachable'); // TODO better error
        }

        cache.handler = handler;
        this.psuriCache.set(psuri, cache);
    }

    public handlePortalRequest(request: PortalRequest) {
        let psuri = this.psuriCache.get(request.psuri);
        if (psuri == null) {
            throw new Error('Received portal request but no stack found.');
        }
        
        return psuri.stack.handlePortalRequest(request);
    }
    
    public async handlePortalResponse(data: {context: any, response: PortalResponse}, res) {
        let psuri = this.psuriCache.get(data.response.psuri);
        if (psuri == null) {
            throw new Error('Received portal request but no stack found.');
        }
        
        return psuri.stack.handlePortalResponse(data.response, res);
    }
    
    public portalRequestDetourToCatcher(psuri: string, {requestId, request}: Protocol.Fetch.RequestPausedEvent, path: string, cdp: CDPSession) {
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
    
    callStacks: Map<Page, CallStack> = new Map<Page, CallStack>();

    public call(packet: any, response: PromiseWithResolvers<unknown>) {
        this.puth.logger.debug(packet, 'Context call');
        this._lastActivity = Date.now();

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

        // Turn object representations into the actual object
        packet.parameters = packet.parameters ? packet.parameters.map((item) => this.resolveIfCached(item)) : [];
        
        let call: Call = new Call(packet, response, on);
        
        let type = Utils.resolveConstructorName(on);
        if (type) {
            // check for extension
            let extension = this.getPlugins().find((ext) => ext.hasAddition(type, packet.function));
            if (extension) {
                let addition = extension.getAddition(type, packet.function);

                if (typeof addition === 'function') {
                    addition = {func: addition};
                }

                call.overwriteOn(extension);
                call.overwriteFn(addition.func);
                call.prependParameters(on);
                call.setExpects(addition.expects);
            }
        } else {
            if (! on[packet.function]) {
                return call.resolve({
                    type: 'error',
                    code: 'FunctionNotFound',
                    message: `Function "${packet.function}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
                });
            }
        }
        
        if (page != null) {
            let parentPage = on instanceof Browser ? on.page : page;
            
            let stack = this.callStacks.get(parentPage);
            if (stack == null) {
                stack = new CallStack(this, parentPage);
                this.callStacks.set(page, stack);
            }
            call.setStack(stack);
            call.setPage(page);
            
            return stack.call(call);
        }

        return this.handleCallApply(call);
    }

    // TODO Cleanup parameters and maybe unify handling in special object
    public async handleCallApply(call: Call): Promise<void> {
        const command = await this.createCommandInstance(call.packet, call.on);
        call.setCommand(command);
        
        if (this.caches.dialog.size === 0) {
            // await this.puth.snapshotHandler.createBefore(this, page, command);
        }

        await this.emitAsync('call:apply:before', {command, page: call.page});
        
        try {
            // @ts-ignore
            let returnValue = await Promise.try(call.fn)
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
            
            this.puth.logger.debug({ packet: call.packet }, '[Call apply returnValue]');
            return call.result(
                await this.handleCallApplyAfter(call, returnValue)
            );
        } catch (error: any) {
            this.puth.logger.debug({ error, packet: call.packet }, '[Call apply error]');
            // call event before any pushToCache call
            await this.emitAsync('call:apply:error', {error, command, page: call.page});

            if (this.shouldSnapshot && command) {
                command.time.finished = Date.now();
                command.time.took = command.time.finished - command.time.started;

                this.puth.snapshotHandler.error(this, call.page, command, {
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

            return call.result(
                error instanceof ExpectationFailed
                    ? error.getReturnInstance().serialize()
                    : {
                        type: 'error',
                        code: 'MethodException',
                        message: `Function ${call.packet.function} threw error: ${error.message}`,
                        error,
                    }
            );
        }
    }

    private async handleCallApplyAfter(call: Call, returnValue: any) {
        let beforeReturn = async () => {
            await this.emitAsync('call:apply:after', {command: call.command, page: call.page});

            // TODO Implement this in events. Event: 'function:call:return'
            this.puth.snapshotHandler.pushToCache(this, call.command);
        };

        if (call.expects != null) {
            if (call.expects.test && ! call.expects.test(returnValue)) {
                // call event before any pushToCache call
                await this.emit('call:expectation:error', {expectation: call.expects, command: call.command, page: call.page});

                if (this.shouldSnapshot) {
                    this.puth.snapshotHandler.error(this, call.page, call.command, {
                        type: 'expectation',
                        expectation: call.expects,
                        time: Date.now(),
                    });
                    this.puth.snapshotHandler.pushToCache(this, call.command);
                }

                return {
                    type: 'error',
                    code: 'expectationFailed',
                    message: call.expects.message,
                };
            }

            if ('return' in call.expects) {
                await beforeReturn();

                return call.expects.return(returnValue);
            }

            if (call.expects.returns) {
                await beforeReturn();

                let {type, represents} = call.expects.returns;
                return this.returnCached(returnValue, type, represents);
            }
        }

        await beforeReturn();

        return this.resolveReturnValue(call, returnValue);
    }

    // TODO add return value resolver structure
    resolveReturnValue(call: Call, returnValue: any) {
        if (returnValue === call.on) {
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

            let values = returnValue.map(rv => this.resolveReturnValue(call, rv));
            let mixed = values.some(value => value.type !== Generic.TYPES.GenericObject);
            
            if (!mixed) {
                return Return.Objects(values).serialize();
            }
            return Return.Array(values).serialize();
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
    
    get logger() {
        return this.puth.logger;
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
    
    get debug(): boolean {
        return this.puth.debug;
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
