import { action, makeAutoObservable, runInAction } from 'mobx';
import { ICommand } from '../Components/Command/Command';
import { logData, pMark, pMeasure } from './Util';
import { decode, ExtensionCodec } from '@msgpack/msgpack';
import ContextStore from '../Mobx/ContextStore';
import { DEBUG } from './Debug';
import { BlobHandler } from './SnapshotRecovering';

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

export type IBlobHandle = {
  blob: Blob;
  url?: string;
  options?: BlobPropertyBag;
};

export type IContext = {
  id: string;
  commands: ICommand[];
  logs: any[];
  responses: IResponse[];
  exceptions: any;
  created: number;
  activeTab: string;
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

class WebsocketHandlerSingleton {
  private websocket: WebSocket | undefined;
  private connected: boolean = false;
  private uri: string | undefined;

  private totalBytesReceived: number = 0;

  private contexts = new Map<string, ContextStore>();

  constructor() {
    makeAutoObservable(this, undefined, {
      // deep: false,
    });

    (window as any).contexts = this.contexts;
  }

  try(uri: string) {
    this.connect(uri, {
      onclose: (event) => {
        let wsUri = prompt('Websocket URI', uri);
        // use setTimeout to clear callstack
        setTimeout(() => this.try(wsUri ?? ''));
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
      this.websocket?.close();
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

    this.websocket.onmessage = (event) => {
      this.receivedBinaryData(event.data);
    };
  }

  @action
  receivedBinaryData(binary: ArrayBuffer, options: any = {}) {
    pMark('packet.received');

    this.totalBytesReceived += binary.byteLength;

    let dateBeforeParse = Date.now();

    let data = decode(binary, { extensionCodec: PUTH_EXTENSION_CODEC });

    pMeasure('decode', 'packet.received');

    let dateAfterParse = Date.now();

    if (!Array.isArray(data)) {
      data = [data];
    }

    // @ts-ignore
    if (options?.returnIfExists && data.length > 0 && this.contexts.has(data[0]?.context?.id ?? data[0]?.id)) {
      alert('Context with same UUID already exists.');
      return;
    }

    // @ts-ignore
    data.forEach((p) => this.receivedPacket(p));

    let dateAfterProcessing = Date.now();

    pMeasure('proc', 'decode');

    DEBUG(() => {
      // tslint:disable
      let size = (binary.byteLength / 1000 / 1000).toFixed(2);

      console.group('Packet received');

      console.groupCollapsed('Events', Array.isArray(data) ? data.length : 1);
      logData(data);
      console.groupEnd();

      console.log('Size', size, 'mb');

      console.log('Delta time parse', dateAfterParse - dateBeforeParse, 'ms');
      console.log('Delta time proc.', dateAfterProcessing - dateAfterParse, 'ms');
      console.log('Delta time debug', Date.now() - dateAfterProcessing, 'ms');

      console.groupEnd();
      // tslint:enable
    });

    pMeasure('debug', 'proc');
  }

  private receivedPacket(packet: any) {
    if (packet.type === 'command') {
      this.addCommand(packet);
    } else if (packet.type === 'log') {
      this.addLog(packet);
    } else if (packet.type === 'request') {
      this.addRequest(packet);
    } else if (packet.type === 'response') {
      this.addResponse(packet);
    } else if (packet.type === 'context') {
      this.addContext(packet);
    } else if (packet.type === 'test') {
      this.addTest(packet);
    } else if (packet.type === 'update') {
      this.addUpdate(packet);
    } else if (packet.type === 'exception') {
      this.addException(packet);
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

  private addRequest(response: any) {
    let context = this.getContext(response.context.id);

    response.context = context;
    context.requests.push(response);
  }

  private addResponse(response: any) {
    let context = this.getContext(response.context.id);

    response.context = context;
    response.contentParsed = {};
    context.responses.push(response);

    let request = context.requests.find((r) => r.requestId === response.requestId);
    request.response = response;
    request.status = 'finished';
  }

  private addContext(response: any) {
    let context = this.getContext(response.id);
    context.test = response.test;
    context.group = response.group;
    context.options = response.options;
    context.capabilities = response.capabilities;
    context.createdAt = response.createdAt;
  }

  private addTest(response: any) {
    let context = this.getContext(response.context.id);

    if (response.specific === 'status') {
      context.test.status = response.status;
    }
  }

  private addUpdate(update: any) {
    let context = this.getContext(update.context.id);

    if (update.specific === 'context.test') {
      context.test.status = update.status;
    } else if (update.specific === 'request.failed') {
      context.requests.find((r) => r.requestId === update.requestId).status = update.status;
    }
  }

  private addException(exception) {
    let context = this.getContext(exception.context.id);
    exception.context = context;
    context.exceptions.push(exception);
  }

  getContext(id: string): ContextStore {
    if (!this.contexts.has(id)) {
      this.contexts.set(id, new ContextStore(id));
    }

    // @ts-ignore
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

  getTotalBytesReceived() {
    return this.totalBytesReceived;
  }

  getMetrics() {
    let metrics = {
      contexts: this.contexts.size,
      events: 0,
    };

    this.contexts.forEach((ctx) => {
      metrics.events += ctx.commands.length;
      metrics.events += ctx.logs.length;
      metrics.events += ctx.requests.length;
      metrics.events += ctx.responses.length;
    });

    return metrics;
  }

  clear() {
    this.contexts.forEach(function cleanupContext(context) {
      context.responses.forEach((response) => {
        if (response.contentParsed?.blob) {
          BlobHandler.revoke(response.contentParsed.blob.url);
        }
      });
    });
    this.contexts.clear();
  }
}

export const WebsocketHandler = new WebsocketHandlerSingleton();
