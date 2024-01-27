import {v4} from 'uuid';
import puppeteer, {Page, Target, Dialog} from 'puppeteer-core';
import Generic from './Generic';
import Snapshots, {ICommand} from './Snapshots';
import * as Utils from './Utils';
import Puth from './Puth';
import PuthContextPlugin from './PuthContextPlugin';
import {PUTH_EXTENSION_CODEC} from './WebsocketConnections';
import mitt, {Emitter, Handler, WildcardHandler} from 'mitt';
import path from 'path';
import {encode} from '@msgpack/msgpack';
import {promises as fsPromise} from 'fs';
import {mkdtemp} from 'node:fs/promises';
import Return from './Context/Return';
import Constructors from './Context/Constructors';
import {tmpdir} from "os";
import {PuthBrowser} from "./HandlesBrowsers";

const {writeFile} = fsPromise;

type ContextEvents = {
    'call': any,
    'get': any,
    'set': any,
    'delete': any,
    'destroying',
    'browser:connected': {browser: PuthBrowser},
    'browser:disconnected': {browser: PuthBrowser},
    'page:created': {browser: PuthBrowser, page: Page},
    'page:closed': {browser: PuthBrowser, page: Page},
}

type ContextOptions = {
    debug: boolean|undefined;
    snapshot: boolean|undefined;
    test: {
        name: undefined|string;
        status: undefined|'failed'|'success';
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

class Context extends Generic {
    private readonly _id: string = v4();
    private readonly _type: string = 'Context';
    private readonly _puth: Puth;
    private readonly _emitter: Emitter<ContextEvents>;
    private readonly _createdAt: number;
    
    private options: ContextOptions;
    private plugins: PuthContextPlugin[] = [];
    private eventFunctions: [any, string, () => {}][] = [];
    private cleanupCallbacks: any = [];
    
    public browsers: PuthBrowser[] = [];
    public caches: ContextCaches = {
        snapshot: {
            lastHtml: '',
        },
        dialog: new Map<Page, Dialog>(),
    };
    
    public shouldSnapshot: boolean = false;
    
    constructor(puth: Puth, options: any = {}) {
        super();
        
        this._puth = puth;
        this._emitter = mitt<ContextEvents>();
        this._createdAt = Date.now();
        
        this.options = options;
        this.shouldSnapshot = this.options?.snapshot === true;
        
        if (this.shouldSnapshot) { // Track context creation
            Snapshots.pushToCache(this, {
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
        for (let pluginClass of this.getPuth().getContextPlugins()) {
            let plugin = new pluginClass();
            await plugin.install(this);
            this.plugins.push(plugin);
        }
    }
    
    public async connectBrowser(options) {
        return await puppeteer.connect(options)
            .then(browser => this.handleNewBrowser(browser));
    }
    
    public async createBrowser(options: any = {}): Promise<PuthBrowser> {
        if (! options.executablePath && this.puth.getInstalledBrowser()?.executablePath) {
            options.executablePath = this.puth.getInstalledBrowser().executablePath;
        }
        
        return await this.puth.browserHandler.launch(options)
            .then(browser => this.handleNewBrowser(browser));
    }
    
    private async handleNewBrowser(browser: PuthBrowser) {
        this.browsers.push(browser);
        
        return await this.trackBrowser(browser)
            .then(() => this.emitter.emit('browser:connected', {browser}))
            .then(() => browser);
    }
    
    public async destroy(options: any = {}) {
        if (this.getTest()?.status !== 'failed') { // succeed test if not defined by client
            this.testSuccess();
        }
        if (options?.save) {
            await this.saveContextSnapshot(options.save);
        }
        
        // unregister all event listeners
        this.eventFunctions.forEach(([page, event, func]) => {
            page.off(event, func);
        });
        
        return await Promise.all(this.browsers.map(browser => this.destroyBrowserByBrowser(browser)))
            .then(() => Promise.all(this.cleanupCallbacks))
            .then(() => true);
    }
    
    public async destroyBrowserByBrowser(browser) {
        return await this.puth.browserHandler.destroy(browser)
            .then(() => this.removeBrowser(browser));
    }
    
    private removeBrowser(browser: PuthBrowser) {
        this.browsers.splice(
            this.browsers.findIndex(b => b === browser),
            1,
        );
    }
    
    isPageBlockedByDialog(page) {
        return this.caches.dialog.has(page);
    }
    
    private async trackBrowser(browser: PuthBrowser) {
        browser.once('disconnected', () => {
            this.removeEventListenersFrom(browser);
            this.emitter.emit('browser:disconnected', {browser});
            this.browsers = this.browsers.filter(b => b !== browser);
        });
        
        this.registerEventListenerOn(browser, 'targetcreated', async (target: Target) => {
            // TODO do we need to track more here? like 'browser' or 'background_page'...?
            if (target.type() === 'page') {
                let page = await target.page();
                this.trackPage(page);
                // @ts-ignore
                this.emitter.emit('page:created', {browser, page});
                // @ts-ignore
                page.on('close', _ => this.emitter.emit('page:closed', {browser, page}));
            }
        });
        
        // Track default browser page (there is no 'targetcreated' event for page[0])
        return await browser.pages()
            .then(pages => {
                let page0 = pages[0];
                this.trackPage(page0);
                this.emitter.emit('page:created', {browser, page: page0});
            });
    }
    
    /**
     * TODO maybe track "outgoing" navigation requests, and stall incoming request until finished loading
     *      but check if we need to make sure if call the object called on needs to be existing
     */
    private trackPage(page) {
        page.on('close', () => this.removeEventListenersFrom(page));
        page.on('dialog', (dialog) => this.caches.dialog.set(page, dialog));
    }
    
    public getSnapshotsByType(type) { // used by clients
        return Return.Values(Snapshots.getAllCachedItemsFrom(this).filter(item => item?.type === type));
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
    
    public exception() {
        // pro feature
    }
    
    public testFailed() { // used by clients
        this.options.test.status = 'failed';
        
        if (this.shouldSnapshot) {
            Snapshots.pushToCache(this, {
                type: 'test',
                specific: 'status',
                status: 'failed',
                context: this.serialize(),
                timestamp: Date.now(),
            });
        }
    }
    
    public testSuccess() {
        this.options.test.status = 'success';
        
        if (this.shouldSnapshot) {
            Snapshots.pushToCache(this, {
                type: 'test',
                specific: 'status',
                status: 'success',
                context: this.serialize(),
                timestamp: Date.now(),
            });
        }
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
                encode(Snapshots.getAllCachedItemsFrom(this), {extensionCodec: PUTH_EXTENSION_CODEC}),
            );
        }
    }
    
    snapshot(func: () => any): void {
        if (! this.shouldSnapshot) {
            return;
        }
        func();
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
            },
            timestamp: now,
        };
    }
    
    public async callAll(calls) {
        return Promise.all(calls.map(call => this.call(call)));
    }
    
    public async callAny(calls) {
        return [await Promise.any(calls.map(call => this.call(call)))];
    }
    
    public async callRace(calls) {
        return [await Promise.race(calls.map(call => this.call(call)))];
    }
    
    public async call(packet) {
        let on = this.resolveOn(packet);
        
        // resolve page object
        let page = Utils.resolveConstructorName(on) === Constructors.Page ? on : on?.frame?.page();
        
        // Create command
        const command = await this.createCommandInstance(packet, on);
        
        // Create snapshot before command
        if (! this.isPageBlockedByDialog(page)) {
            await Snapshots.createBefore(this, page, command);
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
                return this.handleCallApply(
                    packet,
                    page,
                    command,
                    extension,
                    addition.func,
                    [on, ...packet.parameters],
                    addition.expects,
                );
            }
        }
        
        // Check if object has function
        if (! on[packet.function]) {
            return {
                type: 'error',
                code: 'FunctionNotFound',
                message: `Function "${packet.function}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }
        
        // Call original function on object
        return await this.handleCallApply(packet, page, command, on, on[packet.function], packet.parameters)
    }
    
    // TODO Cleanup parameters and maybe unify handling in special object
    private async handleCallApply(packet, page, command, on, func, parameters, expects?) {
        try {
            let returnValue = func.call(on, ...parameters);
            
            // Check if func.call returns a Promise. If so, await return value
            if (returnValue?.constructor?.name === 'Promise') {
                returnValue = await returnValue.catch((error) => {
                    // TODO test if try also catches promise errors without this throw
                    throw error;
                });
            }
            
            command.time.finished = Date.now();
            command.time.took = command.time.finished - command.time.started;
            
            return this.handleCallApplyAfter(packet, page, command, returnValue, expects);
        } catch (error: any) {
            command.time.finished = Date.now();
            command.time.took = command.time.finished - command.time.started;
            
            if (this.shouldSnapshot) {
                Snapshots.error(this, page, command, {
                    type: 'error',
                    specific: 'apply',
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                    },
                    time: Date.now(),
                });
                Snapshots.broadcast(command);
            }
            
            return {
                type: 'error',
                code: 'MethodException',
                message: `Function ${packet.function} threw error: ${error.message}`,
                error,
            };
        }
    }
    
    private async handleCallApplyAfter(packet, page, command, returnValue, expectation?) {
        let beforeReturn = async () => {
            if (this.isPageBlockedByDialog(page)) {
                return;
            }
            
            // TODO Implement this in events. Event: 'function:call:return'
            await Snapshots.createAfter(this, page, command);
        };
        
        if (expectation) {
            if (expectation.test && ! expectation.test(returnValue)) {
                if (this.shouldSnapshot) {
                    Snapshots.error(this, page, command, {
                        type: 'expectation',
                        expectation,
                        time: Date.now(),
                    });
                    Snapshots.broadcast(command);
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
        
        return this.resolveReturnValue(packet, returnValue);
    }
    
    // TODO add return value resolver structure
    resolveReturnValue(action, returnValue) {
        if (returnValue instanceof Return) {
            return returnValue.serialize();
        }
        if (Buffer.isBuffer(returnValue)) {
            return returnValue;
        }
        if (returnValue === null) {
            return Return.Null().serialize();
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
            
            return Return.Array(returnValue.map(rv => this.resolveReturnValue(action, rv))).serialize();
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
        let on = this.resolveOn(action);
        
        let resolvedTo = on[action.property];
        
        if (resolvedTo === undefined) {
            if ([Constructors.ElementHandle, Constructors.JSHandle].includes(Utils.resolveConstructorName(on))) {
                resolvedTo = await (
                    await on.evaluateHandle((handle, property) => handle[property], action.property)
                ).jsonValue();
            }
        }
        
        // If still undefined, return undefined exception
        if (resolvedTo === undefined) {
            return {
                type: 'error',
                code: 'Undefined',
                message: `Property "${action.property}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
            };
        }
        
        // TODO check for other types which are actual instances and not serializable objects
        if ([Constructors.Mouse].includes(Utils.resolveConstructorName(resolvedTo))) {
            return this.returnCached(resolvedTo);
        }
        
        return Return.Value(resolvedTo);
    }
    
    public async set(action) {
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
    
    /**
     * Needed by clients to use the browsers file chooser.
     */
    public async saveTemporaryFile(name, content) {
        let tmpPath = await mkdtemp(path.join(tmpdir(), 'puth-tmp-file-'));
        let tmpFilePath = path.join(tmpPath, name);
        
        await writeFile(tmpFilePath, content);
        
        this.cleanupCallbacks.push(async () => fsPromise.rm(tmpPath, {force: true, recursive: true}));
        
        return Return.Value(tmpFilePath);
    }
    
    resolveOn(representation): Context|any {
        let on = this;
        
        if (representation.type && representation.type !== this.type) {
            on = this.getCache(representation.type)[representation.id];
        }
        
        if (this.options?.debug) {
            this.puth.logger.debug(`[resolveOn] ${Utils.resolveConstructorName(on)} ${representation.function} ${JSON.stringify(representation.parameters)}`);
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
            test: this.getTest(),
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
    
    getTest() {
        if (! this.options?.test) {
            this.options.test = {
                name: undefined,
                status: undefined,
            };
        }
        return this.options.test;
    }
    
    getGroup() {
        return this.options?.group;
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
}

export default Context;
