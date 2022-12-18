import Context from './Context';
import { PuthPlugin, PuthPluginType } from './PuthPluginGeneric';

/**
 * PuthContextPlugin are used to extend the Context instances.
 */
export default abstract class PuthContextPlugin extends PuthPlugin {
  public static readonly PluginType = PuthPluginType.ContextPlugin;

  protected context: Context | undefined;
  protected additions: { [key: string]: {} } = {};

  public install(context: Context): PuthContextPlugin {
    this.context = context;
    return this;
  }

  register(additions: {}) {
    this.additions = { ...this.additions, ...additions };
  }

  hasAddition(type, func) {
    return this.additions?.[type]?.[func] !== undefined || this.additions?.global?.[func] !== undefined;
  }

  async execAddition(type, func, object, parameters) {
    return this.additions[type][func].apply(this, [object, ...parameters]);
  }

  getAddition(type, func) {
    return this.additions?.[type]?.[func] ?? this.additions.global[func];
  }

  getContext(): Context {
    if (!this.context) {
      throw new Error('[PuthContextPlugin] No Context!');
    }
    return this.context;
  }

  getPuth() {
    return this.getContext()?.getPuth();
  }
}
