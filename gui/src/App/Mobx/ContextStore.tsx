import { makeAutoObservable, observable } from 'mobx';
import { ICommand } from '../Components/Command/Command';

export default class ContextStore {
  id: string;
  commands: any[] = [];
  logs: any[] = [];
  requests: any[] = [];
  responses: any[] = [];
  created = Date.now();
  test: {
    name: string;
    status: undefined | 'failed' | 'success';
  } = {
    name: '',
    status: undefined,
  };
  group: string = '';
  options: any[] = [];
  capabilities: any[] = [];
  createdAt: number | undefined;

  constructor(id: string) {
    this.id = id;

    makeAutoObservable(this, {});
  }

  getRenderedTypesFilter() {
    return (command: ICommand) => {
      return ['CDPPage', 'ElementHandle'].includes(command.on.type);
    };
  }

  getRequestFilter() {
    return (request: any) => request.status !== 'pending' && Math.floor(request?.response?.status / 100) !== 2;
  }

  get renderedEvents() {
    return [
      ...this.commands.filter(this.getRenderedTypesFilter()),
      ...this.logs,
      ...this.requests.filter(this.getRequestFilter()),
    ].sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
  }

  getEventTime(event: any) {
    return event?.time?.started ?? event?.time?.created ?? event?.time;
  }
}
