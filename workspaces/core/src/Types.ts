export type IPacket = {
    id: string;
    type: string;
    context: IContext;
    timestamp: number;
}

export type IViewport = {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    isLandscape?: boolean;
    hasTouch?: boolean;
};

export type ICommand = IPacket & {
    type: 'command';
    snapshots: {
        before: ISnapshot|undefined;
        after: ISnapshot|undefined;
    };
    errors: ICommandError[];
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
        finished: number;
    };
};

export enum ContextStatus {
    SUCCESSFUL = 'successful',
    FAILED = 'failed',
    PENDING = 'pending',
}

export type CommandProps = {
    index: number|undefined;
    command: ICommand;
    showTimings: boolean;
};

export type IBlobHandle = {
    blob: Blob;
    url?: string;
    options?: BlobPropertyBag;
};

export type IContext = {
    id: string;
    type: string;
    represents: string;
    test: {
        name: string;
        status: ContextStatus.FAILED|ContextStatus.SUCCESSFUL|ContextStatus.PENDING;
    };
    group: string|undefined;
};

export type IPageInclude = {
    url: string;
    method: string;
    resourceType: string;
    content: Buffer;
    headers: Record<string, string>;
};

export type ISnapshot = {
    type: 'snapshot';
    data?: any;
    version: number;
    url: any;
    viewport: IViewport|null;
    isJavascriptEnabled: boolean;
    includes?: IPageInclude[];
};

export enum SnapshotState {
    BEFORE = 'before',
    AFTER = 'after',
    REPLAY = 'replay',
}

export type IResponse = IPacket & {
    type: 'response';
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

export type ILogLocation = {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
};

export type IConsoleMessageType = 'log' | 'debug' | 'info' | 'error' | 'warning' | 'dir' | 'dirxml' | 'table' | 'trace' | 'clear' | 'startGroup' | 'startGroupCollapsed' | 'endGroup' | 'assert' | 'profile' | 'profileEnd' | 'count' | 'timeEnd' | 'verbose';

export type ILog = {
    type: 'log';
    context: {};
    time: number;
    messageType: IConsoleMessageType;
    args: any[];
    location: ILogLocation;
    text: string;
    stackTrace: ILogLocation[];
};

export type ICommandError = {
    type: string;
    specific?: string;
    error?: Error;
    expectation?: IExpectation;
    time: number;
};

export type IExpectation = {
    test: (value: any) => boolean;
    message: string;
};

export type IExpects = {
    [key: string]: IExpectation;
};
