import path, { join } from 'node:path';
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from 'node:fs';
import { BaseLogger } from 'pino';
import { Server } from "srvx";
import * as H3 from 'h3';
import { plugin as ws } from "crossws/server";
import mitt, { Emitter, Handler, WildcardHandler } from 'mitt';
import Context from './Context';
import { PuthPlugin, PuthPluginGeneric, PuthPluginType } from './PuthPluginGeneric';
import PuthContextPlugin from './PuthContextPlugin';
import PuthInstancePlugin from './PuthInstancePlugin';
import { BrowserHandler, IBrowserHandler } from './handlers/BrowserHandler';
import { WebsocketHandler } from './handlers/WebsocketHandler';
import { SnapshotHandler } from './handlers/SnapshotHandler';

declare global {
    type TODO = any;
}

export type PuthEvents = {
    'context:created': { context: Context };
    'context:destroyed': { context: Context };
    // 'packet': {packet: any};
};

export type PuthOptions = {
    address?: string;
    port?: number;
    silent?: boolean;
    debug?: boolean;
    plugins?: string[];
    dev?: boolean;
    staticDir?: string;
    server?: {
        allowOrigins: string[];
    };
    disableCors?: boolean;
    installedBrowser?: any;
    logger?: BaseLogger;
};

export class Puth {
    // @ts-ignore
    #http: Server;
    #logger: BaseLogger;
    #emitter: Emitter<PuthEvents>;
    #browserHandler: IBrowserHandler;
    #websocketHandler;
    #snapshotHandler;
    #instancePlugins: PuthInstancePlugin[] = [];
    #contextPlugins: PuthPluginGeneric<PuthContextPlugin>[] = [];
    #contexts: { [key: string]: Context } = {};

    private options: PuthOptions;

    constructor(options?) {
        this.#emitter = mitt<PuthEvents>();
        this.options = options;
        this.#logger = options?.logger ?? false;

        if (this.options?.plugins) {
            // TODO this is async code and problematic since user can already write code that would fail if
            //      he uses not imported plugins
            this.options?.plugins.forEach((plugin) => {
                import(path.join(process.cwd(), plugin)).then((ip) => this.use(ip.default));
            });
        }

        this.#browserHandler = new BrowserHandler(this);
        this.#websocketHandler = new WebsocketHandler(this);
        this.#snapshotHandler = new SnapshotHandler(this);

        if (options?.installedBrowser) {
            this.info(
                `Using browser: ${options.installedBrowser.browser} ${options.installedBrowser.buildId} (${options.installedBrowser.platform})`,
            );
        }
    }

    use(plugin: PuthPluginGeneric<PuthPlugin>) {
        if (plugin.PluginType === PuthPluginType.ContextPlugin) {
            if (this.contextPlugins.find((v) => v === plugin)) {
                return;
            }
            this.contextPlugins.push(plugin as PuthPluginGeneric<PuthContextPlugin>);
        } else if (plugin.PluginType === PuthPluginType.InstancePlugin) {
            if (this.instancePlugins.find((v) => v === new plugin())) {
                return;
            }
            let pi = new plugin();
            pi.install(this);
            this.instancePlugins.push(pi as PuthInstancePlugin);
        } else {
            throw new Error('Unsupported plugin type!');
        }

        // @ts-ignore
        this.info(`Plugin loaded: ${plugin?.default?.name ?? plugin?.name ?? plugin.constructor?.name}`);
    }

    public serve(port = 7345, hostname = '127.0.0.1'): Server {
        if (this.http !== undefined) {
            throw new Error('Serve already called on this Puth instance.');
        }

        /**
         * TODO
         *     private setupFastify(allowedOrigins: string[]) {
         *         if (this.options?.disableCors !== true) {
         *             this.server.register(fastifyCors, {
         *                 origin: allowedOrigins,
         *             });
         *         }
         *     }
         */

        let h3 = new H3.H3({
            debug: true,
            onError: (error) => {
                this.logger.error(error);
            },
        });

        const cors = {
            origin: [
                `http://${hostname}:${port}`,
                ...(this.options?.server?.allowOrigins ?? []),
            ],
        };

        // [Middleware] CORS
        h3.use((event) => {
            if (H3.handleCors(event, cors)) {
                return;
            }
            // if (!H3.isCorsOriginAllowed(event.req.headers.get('origin'), cors)) {
            //     if (event.req.headers.get('upgrade') === 'websocket') {
            //         return; // let the websocket handle upgrade hook handle cors
            //     }
            //
            //     return new Response('Request blocked - Origin not in CORS allowlist.', {status: 401});
            // }
        });

        const json = handler => event => event.req.json().then(handler);
        const defer = handler => new Promise((resolve, reject) => handler({resolve, reject}));

        h3.post('/context', json(data => this.contextCreate(data)));
        h3.patch('/context/call', json(data => defer(handle => this.contextCall(data, handle))));
        h3.patch('/context/get', json(data => this.contextGet(data)));
        h3.patch('/context/set', json(data => this.contextSet(data)));
        h3.patch('/context/delete', json(data => this.contextDelete(data)));
        // TODO fix response based on contextDestroy return value (bool)
        h3.delete('/context', json(data => this.contextDestroy(data)));

        h3.patch('/portal/response', json(data => defer(handle => this.portalResponse(data, handle))));
        h3.post('/portal/detour/**', async (event) => {
            let cid = event.req.headers.get('puth-portal-context-id');
            let psuri = event.req.headers.get('puth-portal-psuri');
            let url = event.req.headers.get('puth-portal-url');
            let path = event.req.headers.get('puth-portal-path');

            if (cid == null) throw H3.HTTPError.status(422, 'Portal detour missing required header [cid]');
            if (psuri == null) throw H3.HTTPError.status(422, 'Portal detour missing required header [psuri]');
            if (url == null) throw H3.HTTPError.status(422, 'Portal detour missing required header [url]');

            let context = this.#contexts[cid];
            if (context == null) throw H3.HTTPError.status(422, `Portal detour - context not found [${cid}]`);

            // TODO instead of passing the request as is, catch multipart and decode it so it can be easier used
            //      for mocking in laravel/symfony
            // TODO implement detour for all other binary request types
            // const multipart = await event.req.formData();
            // const parts: any = [];
            // multipart.forEach((value, key) => parts.push({key, value, type: value instanceof File ? 'file' : 'string'}));
            // await Promise.all(parts.map(async part => {
            //     if (part.type !== 'file') return;
            //     return part.value.arrayBuffer()
            //         .then(buffer => btoa(String.fromCharCode.apply(null, buffer)))
            //         .then(base64 => part.value = base64);
            // }));

            let bytes = await event.req.bytes();
            let data = process.versions.bun ? bytes.toBase64() : bytes.toString('base64');

            return defer(async handle => {
                context.setPsuriHandler(
                    psuri,
                    // TODO handle portal network error - Fetch.failRequest
                    (error, status, data, headers) => handle.resolve(
                        new Response(data, {
                            status,
                            headers: headers.map((header): [string, string] => [header.name, header.value]),
                        }),
                    ),
                );

                context.handlePortalRequest({
                    psuri,
                    url: decodeURI(url),
                    path: decodeURI(path ?? ''),
                    headers: event.req.headers,
                    // @ts-ignore
                    data,
                    method: event.req.method,
                });
            });
        });

        h3.get(
            "/websocket",
            H3.defineWebSocketHandler({
                upgrade: (req) => {
                    // if (!H3.isCorsOriginAllowed(req.headers.get('origin'), cors)) {
                    //     return new Response('Request blocked - Origin not in CORS allowlist.', {status: 401});
                    // }
                },
                open: (peer) => {
                    this.websocketHandler.push(peer)
                    peer.send(this.websocketHandler.serialize(this.snapshotHandler.getAllCachedItems()));
                },
                close: (peer) => this.websocketHandler.pop(peer),
                message: (peer, message) => {
                    // TODO verify
                    let packet: any = this.websocketHandler.decode(message.arrayBuffer());
                    if (packet?.type === 'event') {
                        if (packet.on === 'puth') {
                            this.#emitter.emit(packet.event.type, packet.event.arg);
                        }
                    }
                },
            }),
        )

        // GUI
        h3.get('/', (event) => createReadStream(guiIndexFilePath));

        const guiIndexFilePath = require.resolve('@puth/gui/dist/index.html');
        const staticDir = this.options?.staticDir ?? path.dirname(guiIndexFilePath);
        this.logger.debug(`Serving static files from ${staticDir}`);
        h3.get('/**', (event) => H3.serveStatic(event, {
            indexNames: [],
            getContents: (id) => {
                return readFile(join(staticDir, id === '/' ? 'index.html' : id));
            },
            getMeta: async (id) => {
                const stats = await stat(join(staticDir, id === '/' ? 'index.html' : id)).catch(() => {});
                if (stats?.isFile()) {
                    return {
                        size: stats.size,
                        mtime: stats.mtimeMs,
                    };
                }
            },
        }));

        this.#http = H3.serve(h3, {
            hostname,
            port,
            // @ts-ignore
            plugins: [ws({ resolve: async (req) => (await h3.fetch(req)).crossws })],
            silent: true,
        });

        this.logger.info(`Server listening at http://${hostname}:${port}`);

        return this.#http;
    }

    info(string) {
        this.logger?.info(string);
    }

    public async contextCreate(options = {}) {
        let context = new Context(this as TODO, options);
        this.#contexts[context.id] = context;
        await context.setup();
        this.#emitter.emit('context:created', { context });
        return context.serialize();
    }

    public portalResponse(packet, res) {
        return this.#contexts[packet.context.id].handlePortalResponse(packet, res);
    }

    public contextCall(packet, res) {
        return this.#contexts[packet.context.id].call(packet, res);
    }

    public contextGet(packet) {
        return this.#contexts[packet.context.id].get(packet);
    }

    public contextSet(packet) {
        return this.#contexts[packet.context.id].set(packet);
    }

    public contextDelete(packet) {
        return this.#contexts[packet.context.id].delete(packet);
    }

    public async contextDestroy(packet) {
        let { id } = packet as { id: string };

        if (id in this.#contexts) {
            let destroyed = await this.#contexts[id].destroy(packet?.options);
            if (destroyed) {
                this.#emitter.emit('context:destroyed', { context: this.#contexts[id] });
                delete this.#contexts[id];
            }

            return true;
        }

        return false;
    }

    // public contextCallAll(packet) {
    //     return this.#contexts[packet.context.id].callAll(packet.calls);
    // }
    //
    // public contextCallAny(packet) {
    //     return this.#contexts[packet.context.id].callAny(packet.calls);
    // }
    //
    // public contextCallRace(packet) {
    //     return this.#contexts[packet.context.id].callRace(packet.calls);
    // }

    get logger() {
        return this.#logger;
    }

    get debug() {
        return this.options?.debug === true;
    }

    get installedBrowser() {
        return this.options?.installedBrowser;
    }

    get browserHandler() {
        return this.#browserHandler;
    }

    get websocketHandler() {
        return this.#websocketHandler;
    }

    get snapshotHandler() {
        return this.#snapshotHandler;
    }

    get contextPlugins() {
        return this.#contextPlugins;
    }

    get instancePlugins() {
        return this.#instancePlugins;
    }

    get http() {
        return this.#http;
    }

    on<Key extends keyof PuthEvents>(type: Key, handler: Handler<PuthEvents[Key]>): void;
    on(type: '*', handler: WildcardHandler<PuthEvents>): void;
    on(type, handler) {
        return this.#emitter.on(type, handler);
    }

    off<Key extends keyof PuthEvents>(type: Key, handler: Handler<PuthEvents[Key]>): void;
    off(type: '*', handler: WildcardHandler<PuthEvents>): void;
    off(type, handler) {
        return this.#emitter.on(type, handler);
    }
}
