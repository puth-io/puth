import { makeAutoObservable } from 'mobx';
import { ICommand } from '../Types';
import Constructors from 'puth/src/Context/Constructors';

export default class ContextStore {
  id;
  
  commands = [];
  logs = [];
  screencasts: any[] = [];
  
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
      return [Constructors.Page, Constructors.ElementHandle].includes(command.on.type);
    };
  }
  
  get renderedEvents() {
    return [
      ...this.commands.filter(this.getRenderedTypesFilter()),
      ...this.logs,
    ].sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
  }
  
  getEventTime(event: any) {
    return event?.time?.started ?? event?.time?.created ?? event?.time;
  }
}
