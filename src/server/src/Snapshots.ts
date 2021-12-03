import Context from './Context';
import { ConsoleMessageType, Page, Viewport } from 'puppeteer';
import * as fs from 'fs';
import { diff_match_patch } from 'diff-match-patch';
import WebsocketConnections from './WebsocketConnections';

// tslint:disable-next-line:no-var-requires
import { IExpectation } from './Expects';

export const DMP = new diff_match_patch();

export type IPageInclude = {
  url: string;
  method: string;
  resourceType: string;
  content: Buffer;
  headers: Record<string, string>;
};

export type ISnapshot = {
  type: 'snapshot';
  html?: any; // @deprecated
  data?: any;
  version: number;
  url: any;
  viewport: Viewport | null;
  isJavascriptEnabled: boolean;
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
    elapsed: number;
    took?: number;
    finished?: number;
  };
};

export type ILogLocation = {
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
};

export type ILog = {
  type: 'log';
  context: {};
  time: number;
  messageType: ConsoleMessageType;
  args: any[];
  location: ILogLocation;
  text: string;
  stackTrace: ILogLocation[];
};

export type IResponse = {
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
  content: Uint8Array;
};

enum SnapshotState {
  BEFORE,
  AFTER,
}

class SnapshotHandler {
  private cache = new Map<Context, (ICommand | ILog | IResponse)[]>();

  pushToCache(context, item, { broadcast } = { broadcast: true }) {
    if (!this.cache.has(context)) {
      // cleanup cache to have at least some memory limit
      if (this.cache.size >= 100) {
        this.cache.delete(this.cache.keys()[0]);
      }

      this.cache.set(context, []);
    }

    // @ts-ignore
    this.cache.get(context).push(item);

    // TODO maybe implement a time buffer to send out multiple snapshots
    if (broadcast) {
      this.broadcast(item);
    }
  }

  log(...msg) {
    fs.appendFileSync(__dirname + '/../../../logs/console.log', msg.join(' ') + '\n');
  }

  async createBefore(context: Context, page: Page, command: ICommand | undefined) {
    if (!command) {
      return;
    }

    command.snapshots.before = await this.makeSnapshot(context, page, SnapshotState.BEFORE);

    // TODO move this into createAfter function?
    this.pushToCache(context, command, { broadcast: false });
  }

  async createAfter(context: Context, page: Page, command: ICommand | undefined) {
    if (!command) {
      return;
    }

    command.time.finished = Date.now();

    try {
      command.snapshots.after = await this.makeSnapshot(context, page, SnapshotState.AFTER);
    } catch (err) {
      // Page navigations break the snapshot process.
      // Retry for a second time, this time puppeteer waits before calling page.evaluate
      // so that the snapshot should be made successfully.
      try {
        command.snapshots.after = await this.makeSnapshot(context, page, SnapshotState.AFTER);
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

  resolveSnapshotBacktrack(commands, index, snapshotState: SnapshotState | null = null) {
    if (index === -1) {
      return '';
    }

    let command: ICommand = commands[index];

    let snapshot;

    if (snapshotState === SnapshotState.AFTER) {
      snapshot = command.snapshots.before;
    } else {
      snapshot = command.snapshots.after;
    }

    if (!snapshot) {
      return '';
    }

    let value = this.resolveSnapshotBacktrack(commands, index - 1);

    // return diff.applyPatch(value, snapshot.data.diff);
    return DMP.patch_apply(snapshot.data.diff, value)[0];
  }

  /**
   * Creates a snapshot of the current dom (with element states)
   *
   * @version 3
   */
  async makeSnapshot(context: Context, page: Page, snapshotState: SnapshotState): Promise<ISnapshot | undefined> {
    if (!page || page.url() === 'about:blank') {
      return;
    }

    let pageSnapshot = await this.createPageSnapshot(page);

    // go through all
    // diff.createPatch();
    let commands: any[] = [];

    if (this.cache.has(context)) {
      commands = this.cache.get(context)?.filter((i) => i.type === 'command') ?? [];
    }

    // TODO cache latest context html snapshot so we don't need to resolve
    let rebuild = this.resolveSnapshotBacktrack(commands, commands.length - 1, snapshotState);
    let patch = DMP.patch_make(rebuild ?? '', pageSnapshot.src);

    return {
      type: 'snapshot',
      version: 3,
      url: page.url(),
      viewport: page.viewport(),
      isJavascriptEnabled: page.isJavaScriptEnabled(),
      data: {
        diff: patch,
        untracked: pageSnapshot.untracked,
      },
    };
  }

  /**
   * Creates a snapshot of the current dom (with element states)
   *
   * @deprecated
   * @version 2
   */
  async makeSnapshotV2(context: Context, page: Page, snapshotState: SnapshotState): Promise<ISnapshot | undefined> {
    if (!page || page.url() === 'about:blank') {
      return;
    }

    return {
      type: 'snapshot',
      version: 2,
      url: page.url(),
      viewport: page.viewport(),
      isJavascriptEnabled: page.isJavaScriptEnabled(),
      html: await this.createPageSnapshot(page),
    };
  }

  async createPageSnapshot(page: Page, { cacheAllStyleTags = false } = {}): Promise<any> {
    if (!page || page.url() === 'about:blank') {
      return;
    }

    return page.evaluate((cacheAllStyleTagsEval) => {
      /**
       * Helper functions
       */
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
        // if (!cacheAllStyleTagsEval) {
        //   return [];
        // }

        // @ts-ignore
        return [...document.styleSheets]
          .map((ss) => {
            let getCssRules = () => {
              let cssRules = [];

              if (!cacheAllStyleTagsEval && !(ss.ownerNode.tagName === 'STYLE' && ss.ownerNode.innerHTML === '')) {
                return;
              }

              try {
                // @ts-ignore
                cssRules = [...ss.cssRules];
              } catch (e) {
                // wtf
                // console.error(e);
              }

              // @ts-ignore
              return cssRules.map((s) => s?.cssText).join('\n');
            };

            return {
              path: getAbsoluteElementPath(ss.ownerNode),
              href: ss.href,
              // only load content if this is not an external stylesheet
              content: ss?.href ? null : getCssRules(),
            };
          })
          .filter((item) => item?.content);
      }

      function getUntrackedState() {
        // @ts-ignore
        return [...document.querySelectorAll('input, textarea, select')].map((el) => ({
          path: getAbsoluteElementPath(el),
          value: el.value,
        }));
      }

      /**
       * Get document content
       */
      let content = '';

      if (document.doctype) {
        content = new XMLSerializer().serializeToString(document.doctype);
      }

      if (document.documentElement) {
        content += document.documentElement.outerHTML;
      }

      return {
        src: content,
        untracked: [getAllStyle(), getUntrackedState()],
      };
    }, cacheAllStyleTags);
  }

  getAllCachedItems() {
    // @ts-ignore
    return [].concat(...this.cache.values());
  }

  getAllCachedItemsFrom(context) {
    if (!this.cache.has(context)) {
      return [];
    }

    // @ts-ignore
    return [].concat(...this.cache.get(context));
  }

  hasCachedItems() {
    return this.cache.size !== 0;
  }
}

const Snapshots = new SnapshotHandler();

export default Snapshots;
