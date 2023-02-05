import { makeAutoObservable } from 'mobx';
import { Events } from '../../main';

// tslint:disable-next-line:no-empty
export let DEBUG: (func: any) => any = () => {};

export class DebugClass {
  private _debug: boolean = false;

  private _originalDebugFunc;

  constructor() {
    makeAutoObservable(this);

    // tslint:disable
    this._originalDebugFunc = console.debug;
    // tslint:enable

    this.debug = localStorage.getItem('debug.enabled') === 'true';
  }

  get debug() {
    return this._debug;
  }

  set debug(value) {
    this._debug = value;

    localStorage.setItem('debug.enabled', value ? 'true' : 'false');

    if (value) {
      this.enable();
    } else {
      this.disable();
    }
  }

  enable() {
    // tslint:disable
    console.debug = this._originalDebugFunc;
    DEBUG = (func) => func();
    Events.on('*', DebugClass.eventLogger);
    // tslint:enable

    this.printPerformanceWarning();
  }

  disable() {
    // tslint:disable
    this._originalDebugFunc = console.debug;
    console.debug = () => {};
    DEBUG = () => {};
    Events.off('*', DebugClass.eventLogger);
    // tslint:enable
  }

  private static eventLogger(type: any, event: any) {
    // tslint:disable-next-line:no-console
    console.debug('[EventLogger]', type, event);
  }

  printPerformanceWarning() {
    // tslint:disable-next-line:no-console
    console.warn('[Puth] Performance is affected by debug');
  }
}
