export type IViewport = {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    isLandscaped: boolean;
};

export type ICommand = {
    id: string;
    type: 'command';
    snapshots: {
        before: any | undefined;
        after: any | undefined;
    };
    errors: [];
    context: IContext;
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
        finished: number;
    };
};

export type CommandProps = {
    index: number | undefined;
    command: ICommand;
    showTimings: boolean;
};

export type IBlobHandle = {
    blob: Blob;
    url?: string;
    options?: BlobPropertyBag;
};

export type IContext = {
    screencasts: any[];
    id: string;
    commands: ICommand[];
    logs: any[];
    responses: IResponse[];
    exceptions: any;
    created: number;
    hasDetails: boolean;
};

type IResponse = {
    type: 'response';
    context: {
        id: string;
    };
    time: number;
    isNavigationRequest: boolean;
    url: string;
    resourceType: string;
    method: string;
    headers: {
        [key: string]: string;
    };
    content: Uint8Array;
    contentParsed: {
        blob?: IBlobHandle;
        string?: string;
    };
};
