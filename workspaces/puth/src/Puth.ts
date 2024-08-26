import path from 'path';
import Fastify, {FastifyRequest} from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import Context from '@/context';
import WebsocketConnections from './WebsocketConnections';
import { PuthPlugin, PuthPluginGeneric, PuthPluginType } from './PuthPluginGeneric';
import PuthContextPlugin from './PuthContextPlugin';
import PuthInstancePlugin from './PuthInstancePlugin';
import {HandlesBrowsers, DefaultBrowserHandler} from "./HandlesBrowsers";
import mitt, {Emitter, Handler, WildcardHandler} from 'mitt';
import {Logger} from "pino";
import Snapshots from "./Snapshots";

declare global {
  type TODO = any;
}

type PuthEvents = {
  'context:created': {context: Context};
  'context:destroyed': {context: Context};
  // 'packet': {packet: any};
}

export default class Puth {
  private contexts: {[key: string]: Context} = {};
  private contextPlugins: PuthPluginGeneric<PuthContextPlugin>[] = [];
  private instancePlugins: PuthInstancePlugin[] = [];
  private emitter: Emitter<PuthEvents>;
  public browserHandler: HandlesBrowsers;
  private server;
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
      this.info(`Using browser: ${options.installedBrowser.browser} ${options.installedBrowser.buildId} (${options.installedBrowser.platform})`);
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

  serve(port = 7345, address = '127.0.0.1', log = true) {
    let allowedOrigins = [`http://${address}:${port}`, ...(this.options?.server?.allowOrigins ?? [])];

    this.server = Fastify({ logger: this.logger, disableRequestLogging: true });
    this.setupFastify(allowedOrigins);
    this.server.listen({ port, host: address });
  }

  public async contextCreate(options = {}) {
    let context = new Context(this as TODO, options);
    this.contexts[context.id] = context;
    await context.setup();
    this.emitter.emit('context:created', {context});
    return context.serialize();
  }

  public contextCall(packet) {
    return this.contexts[packet.context.id].call(packet);
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
        this.emitter.emit('context:destroyed', {context: this.contexts[id]});
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

    this.server.register(require('@fastify/static'), {
      root: this.options?.staticDir ?? path.dirname(require.resolve('@puth/gui/dist/index.html')),
    });

    this.server.register(async (fastify) => {
      fastify.setNotFoundHandler(async (request, reply) => {
        return reply.sendFile('index.html');
      });

      // Create new context
      fastify.post('/context', async (request) => {
        return await this.contextCreate(request.body as {});
      });

      // Perform method call on context
      fastify.patch('/context/call', async (request, reply) => {
        return reply.send(await this.contextCall(request.body));
      });

      // Perform all method call on context
      fastify.patch('/context/call/all', async (request, reply) => {
        return reply.send(await this.contextCallAll(request.body));
      });

      // Perform all method call on context
      fastify.patch('/context/call/any', async (request, reply) => {
        return reply.send(await this.contextCallAny(request.body));
      });

      // Perform all method call on context
      fastify.patch('/context/call/race', async (request, reply) => {
        return reply.send(await this.contextCallRace(request.body));
      });

      // Perform action on context
      fastify.patch('/context/get', async (request, reply) => {
        return reply.send(await this.contextGet(request.body));
      });

      // Perform action on context
      fastify.patch('/context/set', async (request, reply) => {
        return reply.send(await this.contextSet(request.body));
      });

      // Perform action on context
      fastify.patch('/context/delete', async (request, reply) => {
        return reply.send(await this.contextDelete(request.body));
      });

      // delete context with puthId
      fastify.delete('/context', async (request, reply) => {
        let destroyed: any = await this.contextDestroy(request.body);
        return reply.code(destroyed ? 200 : 404).send();
      });

      fastify.get('/websocket', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
        // The websocket protocol doesn't care about CORS so we need to test for request origin.
        if (this.options?.disableCors !== true && !allowedOrigins.includes(req.headers.origin ?? '')) {
          return socket.close();
        }
  
        socket.addEventListener('message', data => {
          let message: any = WebsocketConnections.decode(data);
          
          if (message?.type === 'event') {
            if (message.on === 'puth') {
              this.emitter.emit(message.event.type, message.event.arg);
            }
          }
        });
  
        socket.addEventListener('close', () => {
          WebsocketConnections.pop(socket);
        });

        socket.send(WebsocketConnections.serialize(Snapshots.getAllCachedItems()));
        WebsocketConnections.push(socket);
      });
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
