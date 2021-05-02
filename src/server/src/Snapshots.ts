import Context from './Context';
import { ConsoleMessageType, Page, Viewport, Response } from 'puppeteer';
import * as fs from 'fs';
import WebsocketConnections from './WebsocketConnections';

// tslint:disable-next-line:no-var-requires
import { IExpectation } from './Expects';

export type IPageInclude = {
  url: string;
  method: string;
  resourceType: string;
  content: Buffer;
  headers: Record<string, string>;
};

export type ISnapshot = {
  type: string;
  html: any;
  version: number;
  url: any;
  viewport: Viewport;
  includes?: IPageInclude[];
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
  type: 'log';
  context: {};
  time: number;
  messageType: ConsoleMessageType;
  args: any[];
  location: ILogLocation;
  text: string;
  stackTrace: ILogLocation[];
};

type IResponse = {
  type: 'response';
  context: {};
  time: number;
  isNavigationRequest: boolean;
  url: string;
  resourceType: string;
  method: string;
  headers: {
    [key: string]: string;
  };
  content: Buffer;
};

class SnapshotHandler {
  private snapshots = {};
  private commands: ICommand[] = [];
  private logs: ILog[] = [];
  private responses: IResponse[] = [];

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

  addResponse(response: IResponse) {
    this.responses.push(response);
    this.broadcast(response);
  }

  async createBefore(context: Context, page: Page, command: ICommand | undefined) {
    if (!command) {
      return;
    }

    command.snapshots.before = await this.makeSnapshot(page);

    // TODO move this into createAfter function?
    this.commands.push(command);

    this.cleanPageIncludes(page);
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
   *      to further improve performance (maybe). Should
   *      be 2x improvement if single request.
   *      Every next request that uses the same
   *      stylesheet doesn't need to process and
   *      send it anymore. Also reduces snapshot.pack.
   */
  async makeSnapshot(page: Page): Promise<ISnapshot | undefined> {
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

  getResponses() {
    return this.responses;
  }

  private pageIncludes = new Map<Page, Response[]>();

  addPageInclude(page, response: Response) {
    if (!this.pageIncludes.has(page)) {
      this.pageIncludes.set(page, []);
    }

    let pageInclude = this.pageIncludes.get(page);

    if (!pageInclude) {
      // this should never happen
      return;
    }

    pageInclude.push(response);
  }

  cleanPageIncludes(page) {
    this.pageIncludes.set(page, []);
  }

  async addPageIncludes(page, snapshot) {
    snapshot.includes = this.getPageIncludes(page);
  }

  async getPageIncludes(page) {
    let responses = this.pageIncludes.get(page) ?? [];
    return await Promise.all(
      responses.map(
        async (response): Promise<IPageInclude> => {
          return {
            method: response.request().method(),
            resourceType: response.request().resourceType(),
            url: response.request().url(),
            content: await response.buffer(),
            headers: response.headers(),
          };
        },
      ),
    );
  }
}

const Snapshots = new SnapshotHandler();

export default Snapshots;
