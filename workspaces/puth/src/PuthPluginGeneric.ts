import Puth from './Server';
import Context from './Context';

export enum PuthPluginType {
  ContextPlugin = 'ContextPlugin',
  InstancePlugin = 'InstancePlugin',
}

export type PuthPluginGeneric<T> = {
  new (...args: any[]): T;
  PluginType: PuthPluginType;
};

export abstract class PuthPlugin {
  public static readonly PluginType;

  abstract install(param: Puth | Context): void;
}
