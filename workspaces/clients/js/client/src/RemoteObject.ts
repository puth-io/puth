import {type GenericRepresentation, resolveResponse} from './Remote';
import {RemotePuthClient} from './RemotePuthClient';

// A puppeteer object on the server. These are not generated, so calls on them are forwarded as they are.
export type RemoteHandle = any;

export type RemoteCaller = {
    call: (representation: GenericRepresentation, func: string, parameters: any[]) => Promise<any>;
    destroy: (options?: any) => Promise<any>;
    getRepresentation: () => GenericRepresentation;
};

/**
 * The result of a call, which is also the start of the next one: `await browser.visit(url).type(selector, text)`.
 * Each call runs once the previous one finished, and the chain stops at the first that fails. Awaiting it gives the
 * result of the last call, so a method that returns a value, like `text()`, ends the chain with that value.
 */
// Chain<any> stays any, so untyped calls can return it as every chain.
export type Chain<T> = 0 extends 1 & T ? any : Promise<T> & {
    [K in keyof T as T[K] extends (...args: any[]) => PromiseLike<any> ? K : never]: T[K];
};

const PROMISE_MEMBERS = new Set<PropertyKey>(Object.getOwnPropertyNames(Promise.prototype));

export function chain<T>(promise: Promise<T>): Chain<T> {
    return new Proxy(promise, {
        get(target, property) {
            // Awaiting and handling the chain stay those of the promise.
            if (typeof property === 'symbol' || PROMISE_MEMBERS.has(property)) {
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            }

            return (...args: any[]) => chain(target.then((value: any) => {
                if (typeof value?.[property] !== 'function') {
                    throw new TypeError(`Cannot call ${String(property)}() on the result of the previous call.`);
                }
                return value[property](...args);
            }));
        },
    }) as Chain<T>;
}

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

    protected callFunc(func: string, parameters: any[] = []): Chain<any> {
        return chain(
            Promise.resolve()
                .then(() => this.context.call(this.representation, func, parameters))
                .then(response => resolveResponse(this, this.context, response)),
        );
    }
}

export abstract class ContextBase extends RemoteObject {
    /**
     * Creates a context on the instance at the given URL, or of the given client.
     */
    static create<T extends ContextBase>(
        this: new (context: RemoteCaller, representation: GenericRepresentation) => T,
        client: string | { contextCreate: (options?: any) => Promise<any> },
        options: any = {},
    ): Chain<T> {
        const puth = typeof client === 'string' ? new RemotePuthClient(client) : client;

        return chain(Promise.resolve()
            .then(() => puth.contextCreate(options))
            .then(context => new this(context, context.getRepresentation())));
    }

    destroy(options: any = null): Promise<any> {
        return this.context.destroy(options);
    }
}
