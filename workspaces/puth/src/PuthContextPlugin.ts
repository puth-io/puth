import { PuthPlugin, PuthPluginType } from './PuthPluginGeneric';
import Context from './Context';

/**
 * PuthContextPlugin
 *
 * Every created context gets its own instance of every registered context plugin.
 */
export default abstract class PuthContextPlugin extends PuthPlugin {
    static readonly PluginType = PuthPluginType.ContextPlugin;

    #context?: Context;
    protected additions: { [key: string]: {} } = {};

    public install(context: Context): void {
        this.#context = context;
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

    get context() {
        // TODO instead of checking on every get, verify if all plugins were installed in Puth class
        if (!this.#context) {
            throw new Error('[PuthContextPlugin] Plugin install() was never called.');
        }

        return this.#context;
    }

    get puth() {
        return this.context.puth;
    }
}
