import { v4 } from 'uuid';
import * as puppeteer from 'puppeteer';
import Generic from './Generic';
import Snapshots, { ICommand } from './Snapshots';
import * as Utils from './Utils';
import Puth from './Server';
import PuthContextPlugin from './PuthContextPlugin';
import { PUTH_EXTENSION_CODEC } from './WebsocketConnections';
import { Browser, Page, HTTPRequest, HTTPResponse, Target, ConsoleMessage, Dialog } from 'puppeteer';
import mitt from 'mitt';

import { createBrowser } from './Browser';
import { DaemonBrowser } from './DaemonBrowser';
import path from 'path';
import { encode } from '@msgpack/msgpack';

import {mkdtempSync, promises as fsPromise} from 'fs';
import { mkdtemp } from 'node:fs/promises';
import Return from './Context/Return';
import Constructors from './Context/Constructors';
import {tmpdir} from "os";
const { writeFile } = fsPromise;

class Context extends Generic {
  private readonly id: string = v4();
  private readonly type: string = 'Context';

  private readonly emitter;

  private readonly puth: Puth;
  private options: {
    debug: boolean | undefined;
    snapshot: boolean | undefined;
    test: {
      name: undefined | string;
      status: undefined | 'failed' | 'success';
    };
    group: string | undefined;
    status: string | undefined;
    timeouts?: {
      command?: number;
    };
    dev: boolean | undefined;
    track: string[] | undefined;
  };

  private plugins: PuthContextPlugin[] = [];

  private instances: {
    daemon?: boolean;
    browser?: puppeteer.Browser;
    browserCleanup?: () => {};
    external?: boolean;
  }[] = [];

  private eventFunctions: [any, string, () => {}][] = [];

  private readonly createdAt;

  public caches: {
    snapshot: {
      lastHtml: string;
    };
    dialog: Map<Page, Dialog>;
  } = {
    snapshot: {
      lastHtml: '',
    },
    dialog: new Map<Page, Dialog>(),
  };
  
  private cleanupCallbacks: any = [];

  constructor(puth: Puth, options: any = {}) {
    super();

    this.puth = puth;
    this.options = options;
    // @ts-ignore
    // TODO maybe PR to https://github.com/developit/mitt because broken index.d.ts
    this.emitter = mitt();
    this.createdAt = Date.now();

    // Track context creation
    if (this.shouldSnapshot()) {
      Snapshots.pushToCache(this, {
        ...this.serialize(true),
        options: this.options,
        createdAt: this.createdAt,
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

  async connectBrowser(options) {
    let browser = await puppeteer.connect(options);

    await this._trackBrowser(browser);

    let instance = {
      browser,
      external: true,
    };

    this.instances.push(instance);

    return browser;
  }

  async createBrowser(options = {}) {
    // TODO remove daemon browser code
    // if (this.puth.isDev() || this.isDev()) {
    //   return await this.getDaemonBrowser();
    // }

    let { browser, browserCleanup } = await createBrowser({
      launchOptions: options,
      args: ['--no-sandbox'],
    });

    await this._trackBrowser(browser);

    let instance = {
      browser,
      browserCleanup,
      external: false,
    };

    this.instances.push(instance);

    return browser;
  }

  isDev() {
    return this.options?.dev === true;
  }

  // TODO remove daemon browser code
  // async getDaemonBrowser(options?) {
  //   this.instance.browser = await DaemonBrowser.getBrowser(options);
  //   this.instance.external = true;
  //   this.instance.daemon = true;
  //
  //   await this._trackBrowser(this.instance.browser);
  //
  //   return this.instance.browser;
  // }

  async _trackBrowser(browser: Browser | undefined) {
    if (browser === undefined) {
      return;
    }

    browser.on('disconnected', async () => {
      this.removeEventListenersFrom(browser);
      // TODO ensure browser cleanup
      // await this.destroyBrowserByBrowser(browser);
    });

    // Track default browser page (there is no 'targetcreated' event for page[0])
    this._trackPage((await browser.pages())[0]);

    this.registerEventListenerOn(browser, 'targetcreated', async (target: Target) => {
      // TODO do we need to track more here? like 'browser' or 'background_page'...?
      if (target.type() === 'page') {
        this._trackPage(await target.page());
      }
    });
  }

  async destroy(options: any = null) {
    // Check test status
    if (this.getTest()?.status !== 'failed') {
      this.testSuccess();
    }

    if (options?.save) {
      await this.saveContextSnapshot(options.save);
    }

    this.unregisterAllEventListeners();

    await Promise.all(this.instances.map((instance) => this.destroyBrowserByInstance(instance)));
    
    await Promise.all(this.cleanupCallbacks);

    return true;
  }

  async destroyBrowserByBrowser(browser) {
    return this.destroyBrowserByInstance(this.instances.find((instance) => instance.browser === browser));
  }

  async destroyBrowserByInstance(instance) {
    if (!instance.browser) {
      return this.removeBrowserInstance(instance);
    }

    if (instance.daemon) {
      return this.removeBrowserInstance(instance);
    }

    if (instance.browser.isConnected()) {
      if (instance.external) {
        await instance.browser.disconnect();
      } else {
        await instance.browser.close();
      }
    }

    if (instance.browserCleanup) {
      await instance.browserCleanup();
    }

    this.removeBrowserInstance(instance);
  }

  private removeBrowserInstance(instance) {
    this.instances.splice(
      this.instances.findIndex((i) => i === instance),
      1,
    );
  }

  isPageBlockedByDialog(page) {
    return this.caches.dialog.has(page);
  }

  /**
   * TODO maybe track "outgoing" navigation requests, and stall incoming request until finished loading
   *      but check if we need to make sure if call the object called on needs to be existing
   */
  _trackPage(page) {
    page.on('close', () => this.removeEventListenersFrom(page));
    page.on('dialog', (dialog) => this.caches.dialog.set(page, dialog));

    if (this.shouldSnapshot()) {
      let trackable = (request: HTTPRequest) =>
        ['document', 'stylesheet', 'image', 'media', 'font', 'script', 'manifest', 'xhr', 'fetch'].includes(
          request.resourceType(),
        );

      this.registerEventListenerOn(page, 'request', async (request: HTTPRequest) => {
        if (trackable(request)) {
          Snapshots.pushToCache(this, {
            id: v4(),
            type: 'request',
            context: this.serialize(),
            // @ts-ignore
            requestId: request._requestId,
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
          Snapshots.pushToCache(this, {
            id: v4(),
            type: 'update',
            specific: 'request.failed',
            status: 'failed',
            context: this.serialize(),
            // @ts-ignore
            requestId: request._requestId,
            time: Date.now(),
          });
        }
      });

      this.registerEventListenerOn(page, 'response', async (response: HTTPResponse) => {
        if (trackable(response.request())) {
          Snapshots.pushToCache(this, {
            id: v4(),
            type: 'response',
            context: this.serialize(),
            // @ts-ignore
            requestId: response.request()._requestId,
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

      this.registerEventListenerOn(page, 'console', async (consoleMessage: ConsoleMessage) => {
        let args: any = [];

        try {
          args = await Promise.all(consoleMessage.args().map(async (m) => await m.jsonValue()));
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.warn('Could not serialize args from console message');
        }

        Snapshots.pushToCache(this, {
          id: v4(),
          type: 'log',
          context: this.serialize(),
          time: Date.now(),
          messageType: consoleMessage.type(),
          args,
          location: consoleMessage.location(),
          text: consoleMessage.text(),
          stackTrace: consoleMessage.stackTrace(),
        });
      });
    }

    // this.registerEventListenerOn(page, 'load', (event) => {
    //   console.log('LOAD', event);
    // });
    // this.registerEventListenerOn(page, 'request', async (request) => {
    //   console.log('REQUEST', await request.url(), request._requestId);
    // });
    // this.registerEventListenerOn(page, 'requestfailed', async (request) => {
    //   console.log('REQUEST FINISHED', await request.url());
    // });
    // this.registerEventListenerOn(page, 'requestfinished', async (request) => {
    //   console.log('RESPONSE', await request.url(), request._requestId);
    //   console.log(request);
    // });
  }
  
  getSnapshotsByType(type) {
    return Return.Values(Snapshots.getAllCachedItemsFrom(this).filter(item => item?.type === type));
  }

  // // TODO write _untrackDialogs
  // async _trackDialogs(page) {
  //   this.registerEventListenerOn(page, 'dialog', async (dialog) => {
  //     let action = this.tracked.dialogs.get(page);
  //
  //     if (!action) {
  //       return;
  //     }
  //
  //     await dialog[action[0]](action.length > 1 ? action[1] : undefined);
  //
  //     if (action[0] === 'type') {
  //       await dialog.accept();
  //     }
  //   });
  // }

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

  unregisterAllEventListeners() {
    this.eventFunctions.forEach(([page, event, func]) => {
      page.off(event, func);
    });
  }

  async _cleanPage(page) {
    await page.goto('about:blank');
  }

  testFailed() {
    this.options.test.status = 'failed';

    if (this.shouldSnapshot()) {
      Snapshots.pushToCache(this, {
        type: 'test',
        specific: 'status',
        status: 'failed',
        context: this.serialize(),
      });
    }
  }

  exception(exception) {
    if (this.shouldSnapshot()) {
      Snapshots.pushToCache(this, {
        type: 'exception',
        context: this.serialize(),
        data: exception,
      });
    }
  }

  testSuccess() {
    this.options.test.status = 'success';

    if (this.shouldSnapshot()) {
      Snapshots.pushToCache(this, {
        type: 'test',
        specific: 'status',
        status: 'success',
        context: this.serialize(),
      });
    }
  }

  async saveContextSnapshot(options) {
    let { to } = options;

    if (to === 'file') {
      let { location } = options;
      let storagePath;

      if (!location) {
        location = path.join('storage', 'snapshots');
      }

      if (!Array.isArray(location)) {
        location = [location];
      }

      storagePath = path.join(process.cwd(), ...location, `snapshot-${this.createdAt}-${this.getId()}.puth`);

      await writeFile(
        storagePath,
        encode(Snapshots.getAllCachedItemsFrom(this), { extensionCodec: PUTH_EXTENSION_CODEC }),
      );
    }
  }

  shouldSnapshot(func?: () => any) {
    if (this.options?.snapshot === true) {
      if (func) {
        return func();
      }

      return true;
    }

    return false;
  }

  async createCommandInstance(packet, on): Promise<ICommand | undefined> {
    if (!this.shouldSnapshot()) {
      return;
    }

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
        elapsed: Date.now() - this.createdAt,
        started: Date.now(),
      },
    };
  }

  async call(packet) {
    let on = this.resolveOn(packet);

    // resolve page object
    let page = Utils.resolveConstructorName(on) === Constructors.Page ? on : on?.frame?.page();

    // Create command
    const command: ICommand | undefined = await this.createCommandInstance(packet, on);

    // Create snapshot before command
    if (!this.isPageBlockedByDialog(page)) {
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
          addition = { func: addition };
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
    if (!on[packet.function]) {
      return {
        type: 'error',
        code: 'FunctionNotFound',
        message: `Function "${packet.function}" not found on ${on.constructor ? on.constructor.name : 'object'}`,
      };
    }

    // Call original function on object
    return this.handleCallApply(packet, page, command, on, on[packet.function], packet.parameters);
  }

  // TODO Cleanup parameters and maybe unify handling in special object
  async handleCallApply(packet, page, command, on, func, parameters, expects?) {
    try {
      let returnValue = func.call(on, ...parameters);

      // Check if func.call returns a Promise. If so, await return value
      if (returnValue?.constructor?.name === 'Promise') {
        returnValue = await returnValue.catch((error) => {
          // TODO test if try also catches promise errors without this throw
          throw error;
        });
      }

      this.shouldSnapshot(() => (command.time.took = Date.now() - command.time.started));

      return this.handleCallApplyAfter(packet, page, command, returnValue, expects);
    } catch (error: any) {
      if (this.shouldSnapshot()) {
        command.time.took = Date.now() - command.time.started;

        Snapshots.error(this, page, command, {
          type: 'error',
          specific: 'apply',
          error,
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

  async handleCallApplyAfter(packet, page, command, returnValue, expectation?) {
    let beforeReturn = async () => {
      if (this.isPageBlockedByDialog(page)) {
        return;
      }

      // TODO Implement this in events. Event: 'function:call:return'
      await Snapshots.createAfter(this, page, command);
    };

    if (expectation) {
      if (expectation.test && !expectation.test(returnValue)) {
        if (this.shouldSnapshot()) {
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

        let { type, represents } = expectation.returns;
        return this.returnCached(returnValue, type, represents);
      }
    }

    await beforeReturn();

    // TODO refactor "resolveReturnValue" to "handleValueForReturn"
    if (returnValue instanceof Return) {
      return returnValue.serialize();
    }

    if (!(returnValue instanceof Return)) {
      returnValue = this.resolveReturnValue(packet, returnValue);
    }

    if (returnValue instanceof Return) {
      return returnValue.serialize();
    }

    return returnValue;
  }

  // TODO add return value resolver structure
  resolveReturnValue(action, returnValue) {
    if (Buffer.isBuffer(returnValue)) {
      return returnValue;
    }

    if (returnValue === null) {
      return Return.Null();
    }

    if (Array.isArray(returnValue)) {
      if (returnValue.length === 0) {
        return Return.Values(returnValue);
      }

      // This is also true if the return value content is an associative array
      // TODO implement deep lookup which caches only needed cacheable objects
      //      problem is, if you return mixed content, values and reference objects together,
      //      then the content is not naturally resolvable for the client
      if (Utils.resolveConstructorName(returnValue[0]) === 'Object') {
        return Return.Value(returnValue);
      }

      return Return.Array(returnValue.map(rv => this.resolveReturnValue(action, rv)));
    }

    if (this.isValueSerializable(returnValue)) {
      return Return.Value(returnValue);
    }

    if (returnValue?.type === 'PuthAssertion') {
      return returnValue;
    }
    
    let constructor = Utils.resolveConstructorName(returnValue);
    if (constructor) {
      if (constructor === 'Object') {
        if (this.isObjectSerializable(returnValue)) {
          return Return.Value(returnValue);
        }
      }
      
      return this.returnCached(returnValue);
    }

    return Return.Undefined();
  }
  
  private isObjectSerializable(object) {
    for (let key of Object.keys(object)) {
      if (!this.isValueSerializable(object[key])) {
        return false;
      }
    }
    
    return true;
  }
  
  private isValueSerializable(value) {
    return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number';
  }

  async get(action) {
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
    if (['Mouse'].includes(Utils.resolveConstructorName(resolvedTo))) {
      return this.returnCached(resolvedTo);
    }

    return Return.Value(resolvedTo);
  }

  async set(action) {
    let on = this.resolveOn(action);

    let { property, value } = action;

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

  async delete(action) {
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

  async saveTemporaryFile(name, content) {
    let tmpPath = await mkdtemp(path.join(tmpdir(), 'puth-tmp-file-'));
    let tmpFilePath = path.join(tmpPath, name);
    
    await writeFile(tmpFilePath, content);

    this.cleanupCallbacks.push(async () => fsPromise.rm(tmpPath, {force: true, recursive: true}));
    
    return Return.Value(tmpFilePath);
  }

  resolveOn(representation): Context | any {
    let on = this;

    if (representation.type && representation.type !== this.getType()) {
      on = this.getCache(representation.type)[representation.id];
    }

    if (this.options?.debug) {
      // TODO implement logger
      // tslint:disable-next-line:no-console
      console.log('[resolveOn]', Utils.resolveConstructorName(on), representation.function, representation.parameters);
    }

    return on;
  }

  resolveIfCached(representation) {
    if (representation?.id && representation?.type) {
      return this.getCache(representation.type)[representation.id];
    }

    return representation;
  }

  getId(): string {
    return this.id;
  }

  getType(toLowerCase = false): string {
    return toLowerCase ? this.type.toLowerCase() : this.type;
  }

  serialize(toLowerCase = false) {
    return {
      id: this.getId(),
      type: this.getType(toLowerCase),
      represents: 'PuthContext',
      test: this.getTest(),
      group: this.getGroup(),
    };
  }

  getTest() {
    if (!this.options?.test) {
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

  emit(...args) {
    // @ts-ignore
    return this.emitter.emit(...args);
  }

  off(...args) {
    // @ts-ignore
    return this.emitter.off(...args);
  }

  on(...args) {
    // @ts-ignore
    return this.emitter.on(...args);
  }

  getTimeout(options?) {
    if (options?.timeout != null) {
      return options.timeout;
    }

    return this.options?.timeouts?.command ?? 30 * 1000;
  }
}

export default Context;
