import path from 'path';

import Fastify from 'fastify';
import fastifyWebsocket, { SocketStream } from '@fastify/websocket';
import fastifyCors from '@fastify/cors';

import Context from './Context';
import WebsocketConnections from './WebsocketConnections';
import Snapshots from './Snapshots';
import { PuthPlugin, PuthPluginGeneric, PuthPluginType } from './PuthPluginGeneric';
import PuthContextPlugin from './PuthContextPlugin';
import PuthInstancePlugin from './PuthInstancePlugin';

export default class Puth {
  private contexts: Context[] = [];
  private contextPlugins: PuthPluginGeneric<PuthContextPlugin>[] = [];
  private instancePlugins: PuthInstancePlugin[] = [];

  private server;
  private options: {
    address: string | undefined;
    port: number | undefined;
    silent: boolean | undefined;
    debug: boolean | undefined;
    plugins: string[] | undefined;
    dev: boolean | undefined;
    server: {
      allowOrigins: string[];
    };
    disableCors: boolean | undefined;
  };

  constructor(options?) {
    this.options = options;

    if (this.options?.plugins) {
      // TODO this is async code and problematic since user can already write code that would fail if
      //      he uses not imported plugins
      this.options?.plugins.forEach((plugin) => {
        import(path.join(process.cwd(), plugin)).then((ip) => this.use(ip.default));
      });
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
    this.log('info', '[Puth] Loaded plugin:', plugin?.default?.name ?? plugin?.name ?? plugin.constructor?.name);
  }

  isDebug() {
    return this.options?.debug === true;
  }

  isSilent() {
    return this.options?.silent === true;
  }

  isDev() {
    return this.options?.dev === true;
  }

  async serve(port = 7345, address = '127.0.0.1', log = true) {
    let allowedOrigins = [`http://${address}:${port}`, ...(this.options?.server?.allowOrigins ?? [])];

    this.server = Fastify({ logger: this.isDebug() });
    this.setupFastify(allowedOrigins);

    await this.server.listen({ port, host: address });

    // TODO do smarter type check so we can remove @ts-ignore
    // and thank you typescript for having 4 major versions without interface type checking
    // @ts-ignore
    let uri =
      typeof this.server.server.address() === 'object'
        ? // @ts-ignore
          `${this.server.server.address().address}:${this.server.server.address().port}`
        : this.server.server.address();

    if (log) {
      this.log('info', `[Puth][Server] GUI available on http://${uri}`);
    }
  }

  public log(level = 'info', ...args) {
    if (this.isSilent()) {
      return;
    }
    console[level](...args);
  }

  public async contextCreate(options = {}) {
    let context = new Context(this, options);
    this.contexts[context.getId()] = context;
    await context.setup();
    return context.serialize();
  }

  public contextCall(packet) {
    return this.contexts[packet.context.id].call(packet);
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
      await this.contexts[id].destroy(packet?.options);
      delete this.contexts[id];

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

    // TODO do GUI and probably move to another place but without
    //      server, idk where the gui should be served from
    this.server.register(require('@fastify/static'), {
      root: path.join(__dirname, '../static/gui'),
      // prefix: '/assets',
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

      fastify.get('/websocket', { websocket: true }, (connection: SocketStream, req) => {
        // The websocket protocol doesn't care about CORS so we need to test for request origin.
        if (this.options?.disableCors !== true && !allowedOrigins.includes(req.headers.origin)) {
          return connection.destroy();
        }

        WebsocketConnections.push(connection);

        connection.socket.on('close', () => {
          WebsocketConnections.pop(connection);
        });

        if (Snapshots.hasCachedItems()) {
          connection.socket.send(WebsocketConnections.serialize(Snapshots.getAllCachedItems()));
        }
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
}
