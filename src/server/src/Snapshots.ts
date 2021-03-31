import Context from './Context';
import { ConsoleMessageType, Page } from 'puppeteer';
import * as fs from 'fs';
import WebsocketConnections from './WebsocketConnections';

// tslint:disable-next-line:no-var-requires
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

type IRequest = {
  id: string;
  isNavigationRequest: boolean;
  url: string;
  resourceType: string;
  method: string;
  postData: string;
  headers: {
    [key: string]: string;
  };
  time: number;
};

type IResponse = IRequest & {
  remoteAddress: {
    ip: string;
    port: number;
  };
  text: string;
  status: number;
  statusText: string;
  fromDiskCache: boolean;
  fromServiceWorker: boolean;
  // TODO maybe implement _securityDetails
};

class SnapshotHandler {
  private snapshots = {};
  private commands: ICommand[] = [];
  private logs: ILog[] = [];
  private requests: IRequest[] = [];

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

    try {
      command.snapshots.after = await this.makeSnapshot(page);
    } catch (err) {
      // Page navigations break the snapshot process.
      // Retry for a second time, this time puppeteer waits before calling page.evaluate
      // so that the snapshot should be made successfully.
      try {
        command.snapshots.after = await this.makeSnapshot(page);
      } catch (err) {
        // ignore error
      }
    }

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

  /**
   * Improvements over v1:
   *
   * >> v1: 177.752ms
   * >> v2: 16.162ms
   *
   * In general, v2 is 2-10x faster than v1
   *
   * TODO use page network events to catch style
   *      to further improve performance. Should
   *      be 2x improvement if single request.
   *      Every next request that uses the same
   *      stylesheet doesn't need to process and
   *      send it anymore. Also reduces snapshot.pack.
   * @param page
   */
  async makeSnapshot(page) {
    if (!page || (await page.url()) === 'about:blank') {
      return;
    }

    let untracked = await page.evaluate((_) => {
      return (function () {
        function getAbsoluteElementPath(el) {
          let stack: [string, number][] = [];
          while (el.parentNode != null) {
            let sibCount = 0;
            let sibIndex = 0;

            // TODO Changing this to for of loop breaks the hole thing.
            //      Either disable this lint rule or debug the for of loop.
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < el.parentNode.childNodes.length; i++) {
              let sib = el.parentNode.childNodes[i];
              if (sib.nodeName === el.nodeName) {
                if (sib === el) {
                  sibIndex = sibCount;
                }
                sibCount++;
              }
            }

            if (sibCount > 1) {
              // stack.unshift(el.nodeName.toLowerCase() + ':nth-child(' + (sibIndex + 1) + ')');
              stack.unshift([el.nodeName.toLowerCase(), sibIndex]);
            } else {
              stack.unshift(el.nodeName.toLowerCase());
            }
            el = el.parentNode;
          }
          return stack.splice(1);
        }
        function getAllStyle() {
          // @ts-ignore
          return [...document.styleSheets].map((ss) => ({
            path: getAbsoluteElementPath(ss.ownerNode),
            href: ss.href,
            content: [...ss.cssRules].map((s) => s.cssText).join('\n'),
          }));
        }
        function getUntrackedState() {
          // @ts-ignore
          return [...document.querySelectorAll('input, textarea, select')].map((el) => ({
            path: getAbsoluteElementPath(el),
            value: el.value,
          }));
        }
        return [getAllStyle(), getUntrackedState()];
      })();
    });

    return {
      type: 'snapshot',
      version: 2,
      url: await page.url(),
      viewport: await page.viewport(),
      html: {
        src: await page.content(),
        untracked,
      },
    };
  }

  getLogs() {
    return this.logs;
  }
}

const Snapshots = new SnapshotHandler();

export default Snapshots;
