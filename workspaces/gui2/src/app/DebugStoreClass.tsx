import Events from './Events';
import { makeAutoObservable } from 'mobx';

// tslint:disable-next-line:no-empty
export let DebugStoreClass: (func: any) => any = () => {};

class DevStoreClass {
  private _debug: boolean = false;
  private _connectAutomatically: boolean = false;

  private _originalDebugFunc;

  constructor() {
    makeAutoObservable(this);

    // tslint:disable
    this._originalDebugFunc = console.debug;
    // tslint:enable

    this.debug = localStorage.getItem('debug.enabled') === 'true';
    this.connectAutomatically = localStorage.getItem('connectAutomatically.enabled') === 'true';
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

  get connectAutomatically() {
    return this._connectAutomatically;
  }

  set connectAutomatically(value) {
    this._connectAutomatically = value;

    localStorage.setItem('connectAutomatically.enabled', value ? 'true' : 'false');
  }

  enable() {
    // tslint:disable
    console.debug = this._originalDebugFunc;
    DebugStoreClass = (func) => func();
    Events.on('*', DevStoreClass.eventLogger);
    // tslint:enable

    this.printPerformanceWarning();
  }

  disable() {
    // tslint:disable
    this._originalDebugFunc = console.debug;
    console.debug = () => {};
    DebugStoreClass = () => {};
    Events.off('*', DevStoreClass.eventLogger);
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

/**
 * Debug setup
 */
const DevStore = new DevStoreClass();

export default DevStore;
