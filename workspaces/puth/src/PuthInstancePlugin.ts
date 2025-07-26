import Puth from './Puth';
import { PuthPlugin, PuthPluginType } from './PuthPluginGeneric';

/**
 * PuthInstancePlugins
 *
 * Instance plugins are immediately installed when calling Puth.use.
 */
export default abstract class PuthInstancePlugin extends PuthPlugin {
    static readonly PluginType = PuthPluginType.InstancePlugin;
    #puth?: Puth;

    public install(puth: Puth): void {
        this.#puth = puth;
    }

    get puth(): Puth {
        // TODO instead of checking on every get, verify if all plugins were installed in Puth class
        if (!this.#puth) {
            throw new Error('[PuthInstancePlugin] Plugin install() was never called.');
        }

        return this.#puth;
    }
}
