import { action, makeAutoObservable, runInAction } from 'mobx';
import { ICommand } from './Command';

export type IContext = {
  id: string;
  commands: ICommand[];
  logs: any[];
  created: number;
};

class WebsocketHandlerSingleton {
  private websocket: WebSocket | undefined;
  private connected: boolean = false;
  private uri: string | undefined;

  private contexts = new Map<string, IContext>();

  constructor() {
    makeAutoObservable(this);
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

    this.websocket.onmessage = (event) => {
      let data = JSON.parse(event.data);

      if (Array.isArray(data)) {
        data.forEach((p) => this.receivedPacket(p));
      } else {
        this.receivedPacket(data);
      }
    };
  }

  private receivedPacket(packet) {
    if (packet.type === 'command') {
      this.addCommand(packet);
    } else if (packet.type === 'log') {
      this.addLog(packet);
    }
  }

  private addCommand(command: ICommand) {
    this.getContext(command.context.id).commands.push(command);
  }

  private addLog(log: ICommand) {
    this.getContext(log.context.id).logs.push(log);
  }

  getContext(id) {
    if (!this.contexts.has(id)) {
      this.contexts.set(id, {
        id,
        commands: [],
        logs: [],
        created: Date.now(),
      });
    }

    return this.contexts.get(id);
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
}

export const WebsocketHandler = new WebsocketHandlerSingleton();
