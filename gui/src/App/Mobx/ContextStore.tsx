import { makeAutoObservable, observable } from 'mobx';
import { ICommand } from '../Components/Command/Command';

export default class ContextStore {
  id;
  commands = [];
  logs = [];
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

  get renderedEvents() {
    let events = [...this.commands.filter(this.getRenderedTypesFilter()), ...this.logs];

    events = events.sort((a, b) => {
      let aTime = a.type === 'log' ? a.time : a.time.started;
      let bTime = b.type === 'log' ? b.time : b.time.started;

      return aTime - bTime;
    });

    return events;
  }
}
