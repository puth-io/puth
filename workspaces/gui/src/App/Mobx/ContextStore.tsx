import { makeAutoObservable } from 'mobx';
import { ICommand } from '../Components/Command/Command';

export default class ContextStore {
  id;

  commands = [];
  logs = [];
  requests = [];
  responses = [];
  exceptions = [];

  group: string = '';
  test: {
    name: string;
    status: undefined | 'failed' | 'success';
  } = {
    name: '',
    status: undefined,
  };

  options: {
    [key: string]: any;
  };
  capabilities: {
    [key: string]: boolean;
  };

  createdAt: number;
  created = Date.now();

  constructor(
    id: string,
    options: { [key: string]: any },
    test: { name: string; status: 'failed' | 'success' | undefined },
    group: string,
    capabilities: { [key: string]: boolean },
    createdAt: number,
  ) {
    this.id = id;
    this.options = options;
    this.test = test;
    this.group = group;
    this.capabilities = capabilities;
    this.createdAt = createdAt;

    makeAutoObservable(this, {});
  }

  getRenderedTypesFilter() {
    return (command: ICommand) => {
      return ['CDPPage', 'ElementHandle'].includes(command.on.type);
    };
  }

  get hasDetails() {
    return this.exceptions.length > 0;
  }

  getRequestFilter() {
    return (request: any) => {
      if (['xhr', 'fetch'].includes(request.resourceType)) {
        return true;
      }
      return request.status !== 'pending' && Math.floor(request?.response?.status / 100) !== 2;
    };
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
