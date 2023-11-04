// @ts-nocheck
import { action, makeAutoObservable, runInAction } from 'mobx';
import { ICommand } from '../Components/Command/Command';
import { logData, pMark, pMeasure } from './Util';
import { decode, ExtensionCodec } from '@msgpack/msgpack';
import ContextStore from '../Mobx/ContextStore';
import DevStore, { DebugStoreClass } from './DebugStoreClass';
import Events from "../../Events";

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

class WebsocketHandlerSingleton {
  private websocket: WebSocket | undefined;
  connectionState: number = WebSocket.CLOSED;
  private uri: string | undefined;
  
  private totalBytesReceived: number = 0;
  
  private contexts = new Map<string, ContextStore>();
  
  public connectionSuggestions = [
    (document.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/websocket',
  ];
  
  constructor() {
    makeAutoObservable(this, undefined, {
      // deep: false,
    });
    
    (window as any).contexts = this.contexts;
    
    if (process.env.NODE_ENV === 'development') {
      this.connectionSuggestions = ['ws://127.0.0.1:7345/websocket', ...this.connectionSuggestions];
    }
  }
  
  try(uri: string) {
    this.connect(uri, {
      onclose: () => {
        this.websocket = undefined;
      },
    });
  }
  
  get hasNoContexts() {
    return this.contexts.size === 0;
  }
  
  connect(
      uri: string = 'ws://127.0.0.1:7345/websocket',
      options: {
        retry?: boolean;
        onclose?: (event: CloseEvent) => void;
        timeout?: number;
      } = {},
  ) {
    this.uri = uri;
    this.websocket = new WebSocket(this.uri);
    this.websocket.binaryType = 'arraybuffer';
    
    runInAction(() => (this.connectionState = WebSocket.CONNECTING));
    
    const timeoutTimer = setTimeout(() => {
      this.websocket?.close();
    }, options?.timeout ?? 3 * 1000);
    
    this.websocket.onopen = (event) => {
      clearTimeout(timeoutTimer);
      runInAction(() => (this.connectionState = WebSocket.OPEN));
    };
    
    this.websocket.onclose = (event) => {
      runInAction(() => (this.connectionState = WebSocket.CLOSED));
      
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
    
    DebugStoreClass(() => {
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
    } else if (packet.type === 'context') {
      this.addContext(packet);
    } else if (packet.type === 'test') {
      this.addTest(packet);
    } else if (packet.type === 'update') {
      this.addUpdate(packet);
    } else if (packet.type === 'screencasts') {
      let context = this.getContext(packet.context.id);
      context.screencasts.push(packet);
    }
  }
  
  private addCommand(command: ICommand) {
    let context = this.getContext(command.context.id);
    
    command.context = context;
    context.commands.push(command);
    
    Events.emit('context:event', [context, command]);
  }
  
  private addLog(log: ICommand) {
    let context = this.getContext(log.context.id);
    
    log.context = context;
    context.logs.push(log);
    
    Events.emit('context:event', [context, log]);
  }
  
  private addContext(response: any) {
    let { id, options, test, group, capabilities, createdAt } = response;
    
    let context = new ContextStore(id, options, test, group, capabilities, createdAt);
    this.contexts.set(id, context);
    
    Events.emit('context:created', context);
  }
  
  private addTest(test: any) {
    let context = this.getContext(test.context.id);
    
    if (test.specific === 'status') {
      context.test.status = test.status;
    }
    
    Events.emit('context:event', [context, test]);
  }
  
  private addUpdate(update: any) {
    let context = this.getContext(update.context.id);
    
    if (update.specific === 'context.test') {
      context.test.status = update.status;
    } else if (update.specific === 'request.failed') {
      context.requests.find((r) => r.requestId === update.requestId).status = update.status;
    }
    
    Events.emit('context:event', [context, update]);
  }
  
  getContext(id: string): ContextStore {
    if (!this.contexts.has(id)) {
      throw new Error('No context found with given id!');
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
  
  get isConnected() {
    return this.connectionState === WebSocket.OPEN;
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
    });
    
    return metrics;
  }
  
  clear() {
    this.contexts.clear();
  }
}

const WebsocketHandler = new WebsocketHandlerSingleton();

export default WebsocketHandler;

/**
 * Websocket auto connect
 */
if (DevStore.connectAutomatically) {
  WebsocketHandler.try(WebsocketHandler.connectionSuggestions[0]);
}
