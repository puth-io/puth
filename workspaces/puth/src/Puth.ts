import path from 'node:path';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import Context from './Context';
import WebsocketConnections from './WebsocketConnections';
import { PuthPlugin, PuthPluginGeneric, PuthPluginType } from './PuthPluginGeneric';
import PuthContextPlugin from './PuthContextPlugin';
import PuthInstancePlugin from './PuthInstancePlugin';
import { HandlesBrowsers, DefaultBrowserHandler } from './HandlesBrowsers';
import mitt, { Emitter, Handler, WildcardHandler } from 'mitt';
import { Logger } from 'pino';
import Snapshots from './Snapshots';
import { FastifyRawBodyPlugin } from '@puth/puth/src/utils/external/fastify-raw-body';
import * as H3 from 'h3';
import { plugin as ws } from "crossws/server";
import { Server } from "srvx";
import { HTTPError } from 'h3';

declare global {
    type TODO = any;
}

type PuthEvents = {
    'context:created': { context: Context };
    'context:destroyed': { context: Context };
    // 'packet': {packet: any};
};

export default class Puth {
    private contexts: { [key: string]: Context } = {};
    private contextPlugins: PuthPluginGeneric<PuthContextPlugin>[] = [];
    private instancePlugins: PuthInstancePlugin[] = [];
    private emitter: Emitter<PuthEvents>;
    public browserHandler: HandlesBrowsers;
    private server?: FastifyInstance;
    public readonly logger: Logger;

    private options: {
        address: string | undefined;
        port: number | undefined;
        silent: boolean | undefined;
        debug: boolean | undefined;
        plugins: string[] | undefined;
        dev: boolean | undefined;
        staticDir: string | undefined;
        server: {
            allowOrigins: string[];
        };
        disableCors: boolean | undefined;
        installedBrowser: any;
        logger: any;
    };

    // @ts-ignore
    public http: Server;

    constructor(options?) {
        this.emitter = mitt<PuthEvents>();
        this.options = options;
        this.logger = options?.logger ?? false;

        if (this.options?.plugins) {
            // TODO this is async code and problematic since user can already write code that would fail if
            //      he uses not imported plugins
            this.options?.plugins.forEach((plugin) => {
                import(path.join(process.cwd(), plugin)).then((ip) => this.use(ip.default));
            });
        }

        this.browserHandler = new DefaultBrowserHandler();

        if (options?.installedBrowser) {
            this.info(
                `Using browser: ${options.installedBrowser.browser} ${options.installedBrowser.buildId} (${options.installedBrowser.platform})`,
            );
        }
    }

    private serve(port = 7345, hostname = '127.0.0.1', log = true): Server {
        if (this.http !== undefined) {
            throw new Error('Serve already called on this Puth instance.');
        }

        let h3 = new H3.H3();

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
        // TODO fix response based on contextDestroy return value (bool)
        h3.delete('/context', json(data => this.contextDestroy(data)));

        h3.patch('/portal/response', json(data => defer(handle => this.contextPortalResponse(data, handle))));
        h3.post('/portal/detour/**', async (event) => {
            let cid = event.req.headers.get('puth-portal-context-id');
            let psuri = event.req.headers.get('puth-portal-psuri');
            let url = event.req.headers.get('puth-portal-original-url');

            if (cid == null) throw HTTPError.status(422, 'Portal detour missing required header [cid]');
            if (psuri == null) throw HTTPError.status(422, 'Portal detour missing required header [psuri]');
            if (url == null) throw HTTPError.status(422, 'Portal detour missing required header [url]');

            let context = this.contexts[cid];
            if (context == null) throw HTTPError.status(422, `Portal detour - context not found [${cid}]`);

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

            return defer(async handle => {
                context.setPsuriHandler(
                    psuri,
                    // TODO handle portal network error - Fetch.failRequest
                    (error, status, data, headers) => handle.resolve(
                        new Response(data, {
                            status,
                            headers: headers.map(header => [header.name, header.value])
                        }),
                    ),
                );


                let data = await event.req.bytes();
                context.handlePortalRequest({
                    psuri,
                    url,
                    headers: event.req.headers,
                    data: data.toBase64(),
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
                    WebsocketConnections.push(peer)
                    peer.send(WebsocketConnections.serialize(Snapshots.getAllCachedItems()));
                },
                close: (peer) => WebsocketConnections.pop(peer),
                message: (peer, message) => {
                    // TODO verify
                    let packet: any = WebsocketConnections.decode(message.arrayBuffer());
                    if (packet?.type === 'event') {
                        if (packet.on === 'puth') {
                            this.emitter.emit(packet.event.type, packet.event.arg);
                        }
                    }
                },
            }),
        )

        this.http = H3.serve(h3, {
            hostname,
            port,
            plugins: [ws({ resolve: async (req) => (await h3.fetch(req)).crossws })],
        });

        return this.http;
    }

    // serve(port = 7345, address = '127.0.0.1', log = true) {
    //     let allowedOrigins = [`http://${address}:${port}`, ...(this.options?.server?.allowOrigins ?? [])];
    //
    //     this.server = Fastify({ loggerInstance: this.logger, disableRequestLogging: true });
    //     this.setupFastify(allowedOrigins);
    //     this.server.listen({ port, host: address });
    // }

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

        this.info(`Plugin loaded: ${plugin?.default?.name ?? plugin?.name ?? plugin.constructor?.name}`);
    }

    info(string) {
        if (!this.logger) return;
        this.logger.info(string);
    }

    isDebug() {
        return this.options?.debug === true;
    }

    getInstalledBrowser() {
        return this.options?.installedBrowser;
    }

    public async contextCreate(options = {}) {
        let context = new Context(this as TODO, options);
        this.contexts[context.id] = context;
        await context.setup();
        this.emitter.emit('context:created', { context });
        return context.serialize();
    }

    public contextCall(packet, res) {
        return this.contexts[packet.context.id].call(packet, res);
    }

    public contextCallAll(packet) {
        return this.contexts[packet.context.id].callAll(packet.calls);
    }

    public contextCallAny(packet) {
        return this.contexts[packet.context.id].callAny(packet.calls);
    }

    public contextCallRace(packet) {
        return this.contexts[packet.context.id].callRace(packet.calls);
    }

    public contextPortalResponse(packet, res) {
        return this.contexts[packet.context.id].handlePortalResponse(packet, res);
    }

    public contextGet(packet) {
        return this.contexts[packet.context.id].get(packet);
    }

    public contextSet(packet) {
        return this.contexts[packet.context.id].set(packet);
    }

    public contextDelete(packet) {
        return this.contexts[packet.context.id].delete(packet);
    }

    public async contextDestroy(packet) {
        let { id } = packet as { id: string };

        if (id in this.contexts) {
            let destroyed = await this.contexts[id].destroy(packet?.options);
            if (destroyed) {
                this.emitter.emit('context:destroyed', { context: this.contexts[id] });
                delete this.contexts[id];
            }

            return true;
        }

        return false;
    }

    private setupFastify(allowedOrigins: string[]) {
        if (this.options?.disableCors !== true) {
            this.server.register(fastifyCors, {
                origin: allowedOrigins,
            });
        }

        this.server.register(fastifyWebsocket);
        this.server.register(FastifyRawBodyPlugin);
        // this.server.register(fastifyMultipart);

        // this.server.addContentTypeParser('*', function (request, payload, done) {
        //     done(null, payload)
        // })

        this.server.register(require('@fastify/static'), {
            root: this.options?.staticDir ?? path.dirname(require.resolve('@puth/gui/dist/index.html')),
        });

        this.server.register(async (fastify) => {
            fastify.setNotFoundHandler(async (request, reply) => {
                return reply.sendFile('index.html');
            });

            // // Perform all method call on context
            // fastify.patch('/context/call/all', async (request, reply) => {
            //     return reply.send(await this.contextCallAll(request.body));
            // });
            //
            // // Perform all method call on context
            // fastify.patch('/context/call/any', async (request, reply) => {
            //     return reply.send(await this.contextCallAny(request.body));
            // });
            //
            // // Perform all method call on context
            // fastify.patch('/context/call/race', async (request, reply) => {
            //     return reply.send(await this.contextCallRace(request.body));
            // });
            //
            // // Perform action on context
            // fastify.patch('/context/get', async (request, reply) => {
            //     return reply.send(await this.contextGet(request.body));
            // });
            //
            // // Perform action on context
            // fastify.patch('/context/set', async (request, reply) => {
            //     return reply.send(await this.contextSet(request.body));
            // });

            // // Perform action on context
            // fastify.patch('/context/delete', async (request, reply) => {
            //     return reply.send(await this.contextDelete(request.body));
            // });

            // implement rawBody instead of setting bodyLimit: 1
            // fastify.all('/detour', {config: {rawBody: true}}, async (request, reply) => {
            //     console.error('body', request.rawBody);
            //
            //     let cid = request.headers['puth-portal-context-id'] as string|undefined;
            //     if (cid == null) throw new Error('Unreachable'); // TODO better error
            //     let psuri = request.headers['puth-portal-psuri'] as string|undefined;
            //     if (psuri == null) throw new Error('Unreachable'); // TODO better error
            //     let url = request.headers['puth-portal-original-url'] as string|undefined;
            //     if (url == null) throw new Error('Unreachable'); // TODO better error
            //
            //     let context = this.contexts[cid];
            //
            //     return await reply.send(await new Promise((resolve, reject) => {
            //         context.setPsuriHandler(
            //             psuri,
            //             // TODO handle portal network error - Fetch.failRequest
            //             async (error, status, data, headers) => {
            //                 reply.code(status);
            //                 headers.forEach(header => reply.header(header.name, header.value));
            //                 resolve(data);
            //             },
            //         );
            //         context.handlePortalRequestNew({
            //             psuri,
            //             url,
            //             headers: request.headers as TODO as Protocol.Network.Headers,
            //             data: request.body as string|undefined,
            //             method: request.method,
            //         });
            //     }));
            // });
        });
    }

    getContextPlugins() {
        return this.contextPlugins;
    }

    getInstancePlugins() {
        return this.instancePlugins;
    }

    getServer() {
        return this.server;
    }

    on<Key extends keyof PuthEvents>(type: Key, handler: Handler<PuthEvents[Key]>): void;
    on(type: '*', handler: WildcardHandler<PuthEvents>): void;
    on(type, handler) {
        return this.emitter.on(type, handler);
    }

    off<Key extends keyof PuthEvents>(type: Key, handler: Handler<PuthEvents[Key]>): void;
    off(type: '*', handler: WildcardHandler<PuthEvents>): void;
    off(type, handler) {
        return this.emitter.on(type, handler);
    }
}
