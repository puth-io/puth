import {type GenericRepresentation, resolveResponse} from './Remote';

// A puppeteer object on the server. These are not generated, so calls on them are forwarded as they are.
export type RemoteHandle = any;

export type RemoteCaller = {
    call: (representation: GenericRepresentation, func: string, parameters: any[]) => Promise<any>;
    destroy: (options?: any) => Promise<any>;
    getRepresentation: () => GenericRepresentation;
};

const remoteClasses = new Map<string, new (context: RemoteCaller, representation: GenericRepresentation) => RemoteObject>();

export function registerRemoteClass(represents: string, remoteClass: typeof remoteClasses extends Map<string, infer C> ? C : never) {
    remoteClasses.set(represents, remoteClass);
}

export function createRemoteObject(context: RemoteCaller, representation: GenericRepresentation) {
    const remoteClass = remoteClasses.get(representation.represents);

    return remoteClass === undefined ? undefined : new remoteClass(context, representation);
}

export abstract class RemoteObject {
    protected readonly context: RemoteCaller;
    protected readonly representation: GenericRepresentation;

    constructor(context: RemoteCaller, representation: GenericRepresentation) {
        this.context = context;
        this.representation = representation;
    }

    getRepresentation(): GenericRepresentation {
        return this.representation;
    }

    // Objects are sent as a reference when they are passed as a parameter.
    toJSON(): GenericRepresentation {
        return this.representation;
    }

    protected async callFunc(func: string, parameters: any[] = []): Promise<any> {
        return resolveResponse(this, this.context, await this.context.call(this.representation, func, parameters));
    }
}

export abstract class ContextBase extends RemoteObject {
    /**
     * Creates a context on the instance of the given client.
     */
    static async create<T extends ContextBase>(
        this: new (context: RemoteCaller, representation: GenericRepresentation) => T,
        client: { contextCreate: (options?: any) => Promise<any> },
        options: any = {},
    ): Promise<T> {
        const context = await client.contextCreate(options);

        return new this(context, context.getRepresentation());
    }

    destroy(options: any = null): Promise<any> {
        return this.context.destroy(options);
    }
}
