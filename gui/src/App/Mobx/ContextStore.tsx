import { makeAutoObservable, observable } from 'mobx';
import { ICommand } from '../Components/Command/Command';

export default class ContextStore {
  id;
  commands = [];
  logs = [];
  requests = [];
  responses = [];
  created = Date.now();
  test: {
    name: string;
    status: undefined | 'failed' | 'success';
  } = {
    name: '',
    status: undefined,
  };
  group: string;
  options: [];
  capabilities: [];
  createdAt: number;

  constructor(id) {
    this.id = id;

    makeAutoObservable(this, {});
  }

  getRenderedTypesFilter() {
    return (command: ICommand) => {
      return ['Page', 'ElementHandle'].includes(command.on.type);
    };
  }

  getRequestFilter() {
    return (request) => Math.floor(request?.response?.status / 100) !== 2;
  }

  get renderedEvents() {
    return [
      ...this.commands.filter(this.getRenderedTypesFilter()),
      ...this.logs,
      ...this.requests.filter(this.getRequestFilter()),
    ].sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
  }

  getEventTime(event) {
    return event?.time?.started ?? event?.time?.created ?? event?.time;
  }
}
