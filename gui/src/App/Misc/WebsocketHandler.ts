import { action, makeAutoObservable, observable, runInAction } from 'mobx';
import { ICommand } from '../Components/Command/Command';
import { logData, pMark, pMeasure } from './Util';
import { decode, ExtensionCodec } from '@msgpack/msgpack';
import ContextStore from '../Mobx/ContextStore';

export const DEBUG_ENABLED = true; // process.env.NODE_ENV === 'development'
export const PUTH_EXTENSION_CODEC = new ExtensionCodec();

PUTH_EXTENSION_CODEC.register({
  type: 0,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof Function) {
      return new TextEncoder().encode((object as () => void).toString());
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    return new TextDecoder().decode(data);
  },
});

export type IContext = {
  id: string;
  commands: ICommand[];
  logs: any[];
  responses: IResponse[];
  created: number;
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
  content: {
    data: any[];
    type: string;
  };
};

class WebsocketHandlerSingleton {
  private websocket: WebSocket | undefined;
  private connected: boolean = false;
  private uri: string | undefined;

  private contexts = new Map<string, ContextStore>();

  constructor() {
    makeAutoObservable(this, null, {
      // deep: false,
    });

    (window as any).contexts = this.contexts;
  }

  try(uri: string) {
    this.connect(uri, {
      onclose: (event) => {
        let wsUri = prompt('Websocket URI', uri);
        // use setTimeout to clear callstack
        setTimeout(() => this.try(wsUri));
      },
    });
  }

  connect(
    uri: string = 'ws://127.0.0.1:4000/websocket',
    options: {
      retry?: boolean;
      onclose?: (event: CloseEvent) => void;
      timeout?: number;
    } = {},
  ) {
    this.uri = uri;
    this.websocket = new WebSocket(this.uri);

    this.websocket.binaryType = 'arraybuffer';

    const timeoutTimer = setTimeout(() => {
      this.websocket.close();
    }, options?.timeout ?? 3 * 1000);

    this.websocket.onopen = (event) => {
      clearTimeout(timeoutTimer);
      runInAction(() => (this.connected = true));
    };

    this.websocket.onclose = (event) => {
      runInAction(() => (this.connected = false));

      if (options.retry) {
        setTimeout(() => this.connect(this.uri), 1000);
      }
      if (options.onclose) {
        options.onclose(event);
      }
    };

    this.websocket.onmessage = action((event) => {
      pMark('packet.received');

      let dateBeforeParse = Date.now();

      let data = decode(event.data, { extensionCodec: PUTH_EXTENSION_CODEC });

      pMeasure('decode', 'packet.received');

      let dateAfterParse = Date.now();

      if (Array.isArray(data)) {
        data.forEach((p) => this.receivedPacket(p));
      } else {
        this.receivedPacket(data);
      }

      let dateAfterProcessing = Date.now();

      pMeasure('proc', 'decode');

      if (DEBUG_ENABLED) {
        let size = (event.data.byteLength / 1000 / 1000).toFixed(2);

        console.group('Packet received');

        console.groupCollapsed('Events', Array.isArray(data) ? data.length : 1);
        logData(data);
        console.groupEnd();

        console.log('Size', size, 'mb');

        console.log('Delta time parse', dateAfterParse - dateBeforeParse, 'ms');
        console.log('Delta time proc.', dateAfterProcessing - dateAfterParse, 'ms');
        console.log('Delta time debug', Date.now() - dateAfterProcessing, 'ms');

        console.groupEnd();
      }

      pMeasure('debug', 'proc');
    });
  }

  private receivedPacket(packet) {
    if (packet.type === 'command') {
      this.addCommand(packet);
    } else if (packet.type === 'log') {
      this.addLog(packet);
    } else if (packet.type === 'response') {
      this.addResponse(packet);
    } else if (packet.type === 'context') {
      this.addContext(packet);
    } else if (packet.type === 'test') {
      this.addTest(packet);
    }
  }

  private addCommand(command: ICommand) {
    let context = this.getContext(command.context.id);
    command.context = context;
    context.commands.push(command);
  }

  private addLog(log: ICommand) {
    let context = this.getContext(log.context.id);
    log.context = context;
    context.logs.push(log);
  }

  private addResponse(response: IResponse) {
    let context = this.getContext(response.context.id);
    response.context = context;
    context.responses.push(response);
  }

  private addContext(response) {
    let context = this.getContext(response.id);
    context.test = response.test;
    context.group = response.group;
    context.options = response.options;
    context.capabilities = response.capabilities;
    context.createdAt = response.createdAt;
  }

  private addTest(response) {
    let context = this.getContext(response.context.id);

    if (response.specific === 'status') {
      context.test.status = response.status;
    }
  }

  getContext(id) {
    if (!this.contexts.has(id)) {
      this.contexts.set(id, new ContextStore(id));
    }

    return this.contexts.get(id);
  }

  get contextArray() {
    return Array.from(WebsocketHandler.getContexts().values()).reverse();
  }

  getWebsocket() {
    return this.websocket;
  }

  isConnected() {
    return this.connected;
  }

  getContexts() {
    return this.contexts;
  }

  getUri() {
    return this.uri;
  }
}

export const WebsocketHandler = new WebsocketHandlerSingleton();
