import Context from './Context';
import {ConsoleMessageType, Page, Viewport} from 'puppeteer-core';
import WebsocketConnections from './WebsocketConnections';

// tslint:disable-next-line:no-var-requires
import {IExpectation} from './Expects';

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
    viewport: Viewport|null;
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
        before: ISnapshot|undefined;
        after: ISnapshot|undefined;
    };
    errors: ICommandError[];
    context: {};
    func: string;
    args: string[];
    on: {
        type: string;
        path: [[string, number][]|string][];
    };
    time: {
        started: number;
        elapsed: number;
        took?: number;
        finished?: number;
    };
    timestamp: number;
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
    private cache = new Map<Context, (ICommand|ILog|IResponse)[]>();
    
    pushToCache(context, item, {broadcast} = {broadcast: true}) {
        if (item.cached) {
            return;
        }
        
        if (! this.cache.has(context)) {
            // cleanup cache to have at least some memory limit
            if (this.cache.size >= 100) {
                this.cache.delete(this.cache.keys()[0]);
            }
            
            this.cache.set(context, []);
        }
        
        // @ts-ignore
        this.cache.get(context).push(item);
        item.cached = true;
        
        // TODO maybe implement a time buffer to send out multiple snapshots
        if (broadcast) {
            this.broadcast(item);
        }
    }
    
    async createBefore(context: Context, page: Page, command: ICommand|undefined) {
        if (! command) {
            return;
        }
        
        // TODO move this into createAfter function?
        this.pushToCache(context, command, {broadcast: false});
    }
    
    async createAfter(context: Context, page: Page, command: ICommand|undefined) {
        if (! command) {
            return;
        }
        
        this.pushToCache(context, command, {broadcast: false});
        this.broadcast(command);
    }
    
    error(param: Context, page: Page, command: ICommand|undefined, error: ICommandError) {
        if (! command) {
            return;
        }
        
        command.errors.push(error);
    }
    
    broadcast(object) {
        WebsocketConnections.broadcastAll(object);
    }
    
    getAllCachedItems() {
        // @ts-ignore
        return [].concat(...this.cache.values());
    }
    
    getAllCachedItemsFrom(context): any[] {
        if (! this.cache.has(context)) {
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
