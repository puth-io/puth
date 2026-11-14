import path, { join } from 'node:path';
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from 'node:fs';
import { type BaseLogger } from 'pino';
import { type Server } from "srvx";
import * as H3 from 'h3';
import { plugin as ws } from "crossws/server";
import mitt, { type Emitter, type Handler, type WildcardHandler } from 'mitt';
import Context from './Context';
import { PuthPlugin, PuthPluginType, type PuthPluginGeneric } from './PuthPluginGeneric';
import PuthContextPlugin from './PuthContextPlugin';
import PuthInstancePlugin from './PuthInstancePlugin';
import { BrowserHandler, type IBrowserHandler } from './handlers/BrowserHandler';
import { PUTH_EXTENSION_CODEC, WebsocketHandler } from './handlers/WebsocketHandler';
import { SnapshotHandler, type RecordingBudgets } from './handlers/SnapshotHandler';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { encode } from '@msgpack/msgpack';
import { type PortalFailure } from './utils/CallStack';
import { DEFAULT_SNAPSHOT_RETENTION, type SnapshotRetention } from './utils/SnapshotRetention';

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
    staticDir?: string | false;
    cors?: {
        enabled: boolean,
        allow: string[];
    };
    installedBrowser?: any;
    logger?: BaseLogger;
    // Limits in bytes, measured from encoded packets.
    recording?: Partial<RecordingBudgets>;
    // Limits for the default snapshot directory, false keeps everything.
    snapshotRetention?: Partial<SnapshotRetention>|false;
};

// Lets clients check what an instance supports before relying on it.
const CAPABILITIES = ['context-snapshot', 'network-events', 'context-list', 'handoff'];

const NULL_BODY_STATUSES = [101, 204, 205, 304];

function portalDetourResponse(failure: PortalFailure|undefined, status: number, data: string, headers: any[]): Response {
    // The request already left CDP, so an HTTP status is the only way left to report the failure to the browser.
    if (failure != null) {
        return new Response(failure.message ?? 'Portal request failed.', {
            status: 502,
            headers: { 'puth-portal-error': failure.reason },
        });
    }

    return new Response(
        NULL_BODY_STATUSES.includes(status) ? null : Uint8Array.from(atob(data), c => c.charCodeAt(0)),
        {
            status,
            headers: headers.map((header): [string, string] => [header.name, header.value]),
        },
    );
}

// Clients tell binary results, such as screenshots, from JSON by their content type.
function binaryResponse(value: unknown): unknown {
    if (value instanceof Uint8Array) {
        return new Response(value as BodyInit, { headers: { 'content-type': 'application/octet-stream' } });
    }

    return value;
}

// Headers objects serialize to {}, so the client would get none. The host and the puth-portal-* headers belong to
// the detour, not to the request of the page.
function detourRequestHeaders(headers: Headers): Record<string, string> {
    const plain: Record<string, string> = {};
    headers.forEach((value, name) => {
        if (name !== 'host' && !name.startsWith('puth-portal-')) {
            plain[name] = value;
        }
    });

    return plain;
}

// Request signals cannot tell this apart: they abort as soon as the request body was consumed.
function onClientDisconnect(event: H3.H3Event, callback: () => void) {
    // @ts-ignore
    const response = event.req.runtime?.node?.res;
    response?.once('close', () => {
        if (! response.writableEnded) {
            callback();
        }
    });
}

export class Puth {
    // @ts-ignore
    #http: Server;
    #logger: BaseLogger;
    #emitter: Emitter<PuthEvents>;
    #browserHandler: IBrowserHandler;
    #websocketHandler: WebsocketHandler;
    #snapshotHandler: SnapshotHandler;
    #instancePlugins: PuthInstancePlugin[] = [];
    #contextPlugins: PuthPluginGeneric<PuthContextPlugin>[] = [];
    #contexts: { [key: string]: Context } = {};
    #instanceId = randomUUID();

    private options: PuthOptions;

    constructor(options?) {
        // @ts-ignore
        if (Promise.try == null) {
            throw new Error('Puth requires Promise.try. Please upgrade your Node.js installation.');
        }
        
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

        const h3 = new H3.H3({
            debug: true,
            onError: (error) => {
                this.logger.error(error);
            },
        });
        
        const cors = {
            origin: [
                `http://${hostname}:${port}`,
                ...(this.options?.cors?.allow ?? []),
            ],
        };

        // [Middleware] CORS
        if (this.options?.cors?.enabled !== false) {
            h3.use((event) => {
                if (H3.handleCors(event, cors)) {
                    return;
                }
                /*if (!H3.isCorsOriginAllowed(event.req.headers.get('origin'), cors)) {
                    if (event.req.headers.get('upgrade') === 'websocket') {
                        return; // let the websocket handle upgrade hook handle cors
                    }
                
                    return new Response('Request blocked - Origin not in CORS allowlist.', {status: 401});
                }*/
            });
        }

        const json = handler => event => event.req.json().then(handler);
        const defer = handler => {
            let resolvers = Promise.withResolvers();
            Promise.resolve()
                .then(() => handler(resolvers))
                .catch(resolvers.reject);
            return resolvers.promise;
        }

        const deferTracked = (event: H3.H3Event, data: any, handler: (handle: any) => unknown) => defer((handle: any) => {
            onClientDisconnect(event, () => this.#contexts[data.context?.id]?.clientDisconnected(handle));
            return handler(handle);
        }).then(binaryResponse);

        h3.get('/health', () => this.health());
        h3.get('/diagnostics', () => this.diagnostics());
        h3.get('/contexts', () => this.contexts());
        h3.get('/context/:id/snapshot', (event) => this.contextSnapshot(H3.getRouterParam(event, 'id') as string));
        h3.post('/context/:id/handoff', (event) => this.claimHandoff(H3.getRouterParam(event, 'id') as string));
        h3.delete('/context/:id/handoff', (event) => this.releaseHandoff(H3.getRouterParam(event, 'id') as string));
        h3.post('/context', json(data => this.contextCreate(data)));
        h3.patch('/context/call', event => event.req.json().then(
            data => deferTracked(event, data, handle => this.contextCall(data, handle)),
        ));
        h3.patch('/context/get', json(data => this.contextGet(data)));
        h3.patch('/context/set', json(data => this.contextSet(data)));
        h3.patch('/context/delete', json(data => this.contextDelete(data)));
        // TODO fix response based on contextDestroy return value (bool)
        h3.delete('/context', json(data => this.contextDestroy(data)));

        h3.patch('/portal/response', event => event.req.json().then(
            data => deferTracked(event, data, handle => this.portalResponse(data, handle)),
        ));
        h3.all('/portal/detour/**', async (event) => {
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

            // @ts-ignore
            let bytes = await event.req.bytes();
            let data;
            if (process.versions.bun) {
                data = bytes.toBase64();
            } else if (bytes instanceof Uint8Array) {
                data = Buffer.from(bytes).toString('base64');
            } else {
                data = bytes.toString('base64');
            }

            return defer(async handle => {
                context.setPsuriHandler(
                    psuri,
                    async (failure, status, data, headers) => handle.resolve(
                        portalDetourResponse(failure, status, data, headers),
                    ),
                );
                onClientDisconnect(event, () => {
                    context.cancelPortalRequest(psuri);
                    handle.resolve(new Response(null, { status: 499 }));
                });

                context.handlePortalRequest({
                    psuri,
                    url: decodeURI(url),
                    path: decodeURI(path ?? ''),
                    ip: event.req.ip,
                    headers: detourRequestHeaders(event.req.headers),
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
                    if (this.options?.cors?.enabled !== false) {
                        if (!H3.isCorsOriginAllowed(req.headers.get('origin'), cors)) {
                            return new Response('Request blocked - Origin not in CORS allowlist.', {status: 401});
                        }
                    }
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

        if (this.options?.staticDir !== false) {
            // GUI
            // @ts-ignore
            const guiIndex = createRequire(import.meta.url).resolve('@puth/gui/dist/index.html');
            h3.get('/', (event) => createReadStream(guiIndex));

            const staticDir = this.options?.staticDir ?? path.dirname(guiIndex);
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
        }

        this.#http = H3.serve(h3, {
            hostname,
            port,
            // @ts-ignore
            plugins: [ws({ resolve: async (req) => (await h3.fetch(req)).crossws })],
            silent: true,
            reusePort: true,
        });

        this.logger.info(`Server listening at http://${hostname}:${port}`);
        if (this.options?.cors?.enabled !== false) {
            this.logger.info(`CORS enabled. Allowed origins: ${cors.origin.join(', ')}`);
        }

        return this.#http;
    }

    info(string) {
        this.logger.info(string);
    }

    public async contextCreate(options = {}) {
        let context = new Context(this as TODO, options);
        this.#contexts[context.id] = context;
        try {
            await context.setup();
        } catch (error) {
            await context.destroy({ immediately: true });
            throw error;
        }
        this.#emitter.emit('context:created', { context });
        return context.serialize();
    }

    public health() {
        return {
            version: createRequire(import.meta.url)('../package.json').version,
            instanceId: this.#instanceId,
            capabilities: CAPABILITIES,
        };
    }

    private contextNotFound(id: string) {
        return { type: 'error', code: 'ContextNotFound', message: `Context [${id}] does not exist or was destroyed.` };
    }

    private knownContexts(): Context[] {
        return [...new Set([...Object.values(this.#contexts), ...this.snapshotHandler.recordedContexts()])];
    }

    /**
     * Everything an instance knows about, including finished contexts as long as their recording exists.
     */
    public contexts() {
        return this.knownContexts().map(context => ({
            id: context.id,
            name: context.test.name,
            group: context.getGroup() || context.testGroup,
            status: context.test.status,
            active: this.#contexts[context.id] === context,
            createdAt: context.createdAt,
            recording: this.snapshotHandler.statsOf(context),
            handoff: context.portalHandoff === undefined
                ? undefined
                : { name: context.portalHandoff.name, state: context.portalHandoff.state },
        }));
    }

    public claimHandoff(id: string): Response {
        const claimed = this.#contexts[id]?.claimHandoff();
        if (claimed === undefined) {
            return Response.json({
                type: 'error',
                code: 'HandoffUnavailable',
                message: `Context [${id}] does not wait for a handoff, or it was claimed already.`,
            }, { status: 409 });
        }

        return Response.json(claimed);
    }

    public releaseHandoff(id: string) {
        this.#contexts[id]?.portalHandoff?.end('released');

        return { released: true };
    }

    // Reads the recording without touching the context, so it can keep running.
    public contextSnapshot(id: string): Response {
        const context = this.knownContexts().find(known => known.id === id);
        if (context === undefined) {
            return Response.json(this.contextNotFound(id), { status: 404 });
        }

        const packets = this.snapshotHandler.getAllCachedItemsFrom(context);

        return new Response(encode(packets, { extensionCodec: PUTH_EXTENSION_CODEC }) as BodyInit, {
            headers: {
                'content-type': 'application/octet-stream',
                'content-disposition': `attachment; filename="snapshot-${context.createdAt}-${id}.puth"`,
            },
        });
    }

    public diagnostics() {
        return {
            contexts: Object.values(this.#contexts).map(context => ({
                id: context.id,
                recording: this.snapshotHandler.statsOf(context),
            })),
            recording: this.snapshotHandler.stats(),
            browsers: this.browserHandler.stats(),
        };
    }

    public portalResponse(packet, res) {
        return this.#contexts[packet.context.id].handlePortalResponse(packet, res);
    }

    public contextCall(packet, res) {
        const context = this.#contexts[packet.context.id];
        if (context === undefined) {
            return res.resolve(this.contextNotFound(packet.context.id));
        }

        return context.call(packet, res);
    }

    public contextGet(packet) {
        return this.#contexts[packet.context.id]?.get(packet) ?? this.contextNotFound(packet.context.id);
    }

    public contextSet(packet) {
        return this.#contexts[packet.context.id]?.set(packet) ?? this.contextNotFound(packet.context.id);
    }

    public contextDelete(packet) {
        return this.#contexts[packet.context.id]?.delete(packet) ?? this.contextNotFound(packet.context.id);
    }

    public async contextDestroy(packet) {
        let { id } = packet as { id: string };

        if (id in this.#contexts) {
            await this.#contexts[id].destroy(packet?.options);

            return true;
        }

        return false;
    }

    // Called by every context once it finished tearing down, however the destroy was requested.
    public contextDestroyed(context: Context) {
        if (this.#contexts[context.id] !== context) {
            return;
        }

        delete this.#contexts[context.id];
        this.#emitter.emit('context:destroyed', { context });
    }
    
    async destroy(): Promise<any> {
        await Promise.allSettled([
            this.http?.close(true),
            ...Object.values(this.#contexts).map(context => context.destroy({immediately: true})),
        ]);

        return this.browserHandler.shutdown();
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

    get snapshotRetention(): SnapshotRetention|false {
        const retention = this.options?.snapshotRetention;

        return retention === false ? false : { ...DEFAULT_SNAPSHOT_RETENTION, ...retention };
    }

    get recordingBudgets() {
        return this.options?.recording;
    }

    get installedBrowser() {
        return this.options?.installedBrowser;
    }

    get browserHandler(): IBrowserHandler {
        return this.#browserHandler;
    }

    get websocketHandler(): WebsocketHandler {
        return this.#websocketHandler;
    }

    get snapshotHandler(): SnapshotHandler {
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
        return this.#emitter.off(type, handler);
    }
}
