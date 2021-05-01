import { v4 } from 'uuid';
import * as puppeteer from 'puppeteer';
import Generic from './Generic';
import Snapshots, { ICommand } from './Snapshots';
import * as Utils from './Utils';
import WebsocketConnections from './WebsocketConnections';
import { Puth } from '../Server';
import PuthContextPlugin from './PuthContextPlugin';
import { Browser, Page, Response, Target } from 'puppeteer';
import * as mitt from 'mitt';

import { createBrowser } from '../../../browser/core';
import { DaemonBrowser } from './DaemonBrowser';

const Response = {
  EMPTY: '',
  GenericValue: (val) => ({
    type: 'GenericValue',
    value: val,
  }),
  GenericValues: (val) => ({
    type: 'GenericValues',
    value: val,
  }),
  GenericObjects: (val) => ({
    type: 'GenericObjects',
    value: val,
  }),
};

export enum Capability {
  EVAL = 'EVAL',
}

class Context extends Generic {
  private readonly id: string = v4();
  private readonly type: string = 'Context';

  private readonly emitter;

  private readonly puth: Puth;
  private options: {
    debug: boolean | undefined;
    snapshot: boolean | undefined;
    test: string | undefined;
    group: string | undefined;
    status: string | undefined;
    timeouts?: {
      command?: number;
    };
    dev: boolean | undefined;
    track: string[] | undefined;
  };

  private plugins: PuthContextPlugin[] = [];

  private instance: {
    daemon?: boolean;
    browser?: puppeteer.Browser;
    browserCleanup?: () => {};
    external?: boolean;
  } = {};

  private eventFunctions: [any, string, () => {}][] = [];

  private capabilities = {};

  public tracked = {
    dialogs: new Map<Page, [string, string]>(),
  };

  constructor(puth: Puth, options: any = {}) {
    super();

    this.puth = puth;
    this.options = options;
    // @ts-ignore
    // TODO maybe PR to https://github.com/developit/mitt because broken index.d.ts
    this.emitter = mitt();
  }

  async setup() {
    for (let pluginClass of this.getPuth().getContextPlugins()) {
      let plugin = new pluginClass();
      await plugin.install(this);
      this.plugins.push(plugin);
    }
  }

  async connectBrowser(options) {
    this.instance.browser = await puppeteer.connect(options);
    this.instance.external = true;

    await this._trackBrowser(this.instance.browser);

    return this.instance.browser;
  }

  async createBrowser(options = {}) {
    if (this.puth.isDev() || this.isDev()) {
      return await this.getDaemonBrowser();
    }

    this.instance = await createBrowser({
      launchOptions: options,
      args: ['--no-sandbox'],
    });
    this.instance.external = false;

    await this._trackBrowser(this.instance.browser);

    return this.instance.browser;
  }

  isDev() {
    return this.options?.dev === true;
  }

  async getDaemonBrowser(options?) {
    this.instance.browser = await DaemonBrowser.getBrowser(options);
    this.instance.external = true;
    this.instance.daemon = true;

    await this._trackBrowser(this.instance.browser);

    return this.instance.browser;
  }

  async _trackBrowser(browser: Browser | undefined) {
    if (browser === undefined) {
      return;
    }

    browser.on('disconnected', () => this.removeEventListenersFrom(browser));

    // Track default browser page (there is no 'targetcreated' event for page[0])
    this._trackPage((await browser.pages())[0]);

    this.registerEventListenerOn(browser, 'targetcreated', async (target: Target) => {
      // TODO do we need to track more here? like 'browser' or 'background_page'...?
      if (target.type() === 'page') {
        this._trackPage(await target.page());
      }
    });
  }

  async destroy() {
    this.unregisterAllEventListeners();

    if (this.instance.browser && !this.instance.daemon) {
      if (this.instance.external) {
        await this.instance.browser.disconnect();
      } else {
        await this.instance.browser.close();
      }

      if (this.instance.browserCleanup) {
        await this.instance.browserCleanup();
      }
    }

    return true;
  }

  _trackPage(page) {
    page.on('close', () => this.removeEventListenersFrom(page));

    this.registerEventListenerOn(page, 'response', async (response: Response) => {
      if (['stylesheet', 'image', 'font', 'script', 'manifest'].includes(response.request().resourceType())) {
        Snapshots.addPageInclude(page, response);
      }
    });

    this.registerEventListenerOn(page, 'console', async (consoleMessage) => {
      Snapshots.addLog({
        args: await Promise.all(consoleMessage.args().map(async (m) => await m.jsonValue())),
        type: 'log',
        location: consoleMessage.location(),
        stackTrace: consoleMessage.stackTrace(),
        text: consoleMessage.text(),
        messageType: consoleMessage.type(),
        context: this.serialize(),
        time: Date.now(),
      });
    });

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

  // TODO write _untrackDialogs
  async _trackDialogs(page) {
    this.registerEventListenerOn(page, 'dialog', async (dialog) => {
      let action = this.tracked.dialogs.get(page);

      if (!action) {
        return;
      }

      await dialog[action[0]](action.length > 1 ? action[1] : undefined);

      if (action[0] === 'type') {
        await dialog.accept();
      }
    });
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

  unregisterAllEventListeners() {
    this.eventFunctions.forEach(([page, event, func]) => {
      page.off(event, func);
    });
  }

  async _cleanPage(page) {
    await page.goto('about:blank');
  }

  setCapability(capability, value: true | false) {
    this.capabilities[capability] = value;
  }

  hasCapability(capability: Capability) {
    return this.capabilities[capability] === true;
  }

  // TODO make complete structure
  fail() {
    this.options.status = 'fail';

    WebsocketConnections.broadcastAll({
      type: 'test',
      specific: 'status',
      data: 'fail',
      context: {
        id: this.getId(),
        test: this.getTest(),
        group: this.getGroup(),
      },
    });
  }

  shouldSnapshot() {
    return this.options?.snapshot === true;
  }

  async createCommand(packet, on): Promise<ICommand | undefined> {
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
        started: Date.now(),
      },
    };
  }

  async call(packet) {
    let on = this.resolveOn(packet);

    // resolve page object
    let page = Utils.resolveConstructorName(on) === 'Page' ? on : on?._page;

    // Create command
    const command: ICommand | undefined = await this.createCommand(packet, on);

    // Create snapshot before command
    await Snapshots.createBefore(this, page, command);

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
        message: `Function ${packet.function} not found on ${on.constructor ? on.constructor.name : 'object'}`,
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

      return this.handleCallApplyAfter(packet, page, command, returnValue, expects);
    } catch (error) {
      Snapshots.error(this, page, command, {
        type: 'error',
        specific: 'apply',
        error,
        time: Date.now(),
      });
      Snapshots.broadcast(command);

      return {
        type: 'error',
        code: 'MethodException',
        message: `Function ${packet.function} threw error: ${error.message}`,
        error,
      };
    }
  }

  async handleCallApplyAfter(packet, page, command, returnValue, expectation?) {
    if (expectation) {
      if (expectation.test && !expectation.test(returnValue)) {
        Snapshots.error(this, page, command, {
          type: 'expectation',
          expectation,
          time: Date.now(),
        });
        Snapshots.broadcast(command);

        return {
          type: 'error',
          code: 'expectationFailed',
          message: expectation.message,
        };
      }

      // TODO Implement this in events. Event: 'function:call:return'
      await Snapshots.createAfter(this, page, command);

      if ('return' in expectation) {
        return expectation.return(returnValue);
      }

      if (expectation.returns) {
        let { type, represents } = expectation.returns;

        return this.returnCached(returnValue, type, represents);
      }
    }

    // TODO move this inside handle return function or implement events
    await Snapshots.createAfter(this, page, command);

    return this.resolveReturnValue(packet, returnValue);
  }

  // TODO add return value resolver structure
  resolveReturnValue(action, returnValue) {
    if (Array.isArray(returnValue)) {
      if (returnValue.length === 0) {
        return Response.GenericValues(returnValue);
      }

      // This is also true if the return value content is an associative array
      // TODO implement deep lookup which caches only needed cacheable objects
      //      problem is, if you return mixed content, values and reference objects together,
      //      then the content is not naturally resolvable for the client
      if (Utils.resolveConstructorName(returnValue[0]) === 'Object') {
        return Response.GenericValue(returnValue);
      }
      if (typeof returnValue[0] === 'object') {
        return Response.GenericObjects(returnValue.map((item) => this.returnCached(item)));
      }

      return Response.GenericValue(returnValue);
    }

    if (typeof returnValue === 'string' || typeof returnValue === 'boolean' || typeof returnValue === 'number') {
      return Response.GenericValue(returnValue);
    }

    if (returnValue?.type === 'PuthAssertion') {
      return returnValue;
    }

    if (Utils.resolveConstructorName(returnValue)) {
      return this.returnCached(returnValue);
    }

    // Fallback to returning null because undefined gets
    // ignored by Fastify so no response would be sent
    return null;
  }

  async get(action) {
    let on = this.resolveOn(action);

    if (on[action.property] === undefined) {
      return {
        type: 'error',
        code: 'Undefined',
        message: `Property ${action.property} not found on ${on.constructor ? on.constructor.name : 'object'}`,
      };
    }

    return Response.GenericValue(on[action.property]);
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
        message: `Property ${action.property} could not be set on ${on.constructor ? on.constructor.name : 'object'}`,
      };
    }
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

  getType(): string {
    return this.type;
  }

  serialize() {
    return {
      id: this.getId(),
      type: this.getType(),
      test: this.getTest(),
      group: this.getGroup(),
    };
  }

  getTest() {
    return this.options?.test;
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
    if (options?.timeout) {
      return options.timeout;
    }
    return this.options?.timeouts?.command ?? 30 * 1000;
  }
}

export default Context;
