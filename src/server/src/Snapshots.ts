import Context from './Context';
import { ConsoleMessageType, Page } from 'puppeteer';
import * as fs from 'fs';
import WebsocketConnections from './WebsocketConnections';

// tslint:disable-next-line:no-var-requires
const mhtml2html = require('mhtml2html');
import { JSDOM } from 'jsdom';
import { IExpectation } from './Expects';

export type IViewport = {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscaped: boolean;
};

export type ISnapshot = {
  html: any;
  version: number;
  url: any;
  viewport: IViewport;
};

export type ICommandError = {
  type: string;
  specific?: string;
  error?: Error;
  expectation?: IExpectation;
  time: number;
};

export type ICommand = {
  id: string;
  type: 'command';
  snapshots: {
    before: ISnapshot | undefined;
    after: ISnapshot | undefined;
  };
  errors: ICommandError[];
  context: {};
  func: string;
  args: string[];
  on: {
    type: string;
    path: [[string, number][] | string][];
  };
  time: {
    started: number;
    finished?: number;
  };
};

type ILogLocation = {
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
};

type ILog = {
  args: any[];
  location: ILogLocation;
  text: string;
  messageType: ConsoleMessageType;
  stackTrace: ILogLocation[];
  type: 'log';
  context: {};
  time: number;
};

class SnapshotHandler {
  private snapshots = {};
  private commands: ICommand[] = [];
  private logs: ILog[] = [];

  log(...msg) {
    fs.appendFileSync(__dirname + '/../../../logs/console.log', msg.join(' ') + '\n');
  }

  getSnapshots() {
    return this.snapshots;
  }

  getCommands() {
    return this.commands;
  }

  addLog(log: ILog) {
    this.logs.push(log);
    this.broadcast(log);
  }

  async createBefore(context: Context, page: Page, command: ICommand | undefined) {
    if (!command) {
      return;
    }

    this.commands.push(command);

    command.snapshots.before = await this.makeSnapshot(page);
  }

  async createAfter(context: Context, page: Page, command: ICommand | undefined) {
    if (!command) {
      return;
    }

    command.time.finished = Date.now();
    command.snapshots.after = await this.makeSnapshot(page);

    this.broadcast(command);
  }

  error(param: Context, page: Page, command: ICommand | undefined, error: ICommandError) {
    if (!command) {
      return;
    }

    command.errors.push(error);
  }

  broadcast(object) {
    WebsocketConnections.broadcastAll(object);
  }

  async makeSnapshot(page) {
    if (!page || (await page.url()) === 'about:blank') {
      return;
    }

    return {
      type: 'snapshot',
      version: 1,
      url: await page.url(),
      viewport: await page.viewport(),
      html: await this.getPageSnapshot(page),
    };
  }

  // TODO change snapshot function to content() and with link resolving
  async getPageSnapshot(page: Page) {
    // faster method >> TODO test against page.evaluate()
    // console.time('snapshot_content');
    // const test = await this.page.content();
    // console.timeEnd('snapshot_content');

    try {
      let cdp = await page.target().createCDPSession();
      let { data } = (await cdp.send('Page.captureSnapshot', { format: 'mhtml' })) as { data };

      return mhtml2html.convert(data, { parseDOM: (html) => new JSDOM(html) }).serialize();
    } catch (error) {
      return '';
    }
  }

  getLogs() {
    return this.logs;
  }
}

const Snapshots = new SnapshotHandler();

export default Snapshots;
