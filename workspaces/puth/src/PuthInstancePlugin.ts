import Puth from './Puth';
import { PuthPlugin, PuthPluginType } from './PuthPluginGeneric';

/**
 * PuthInstancePlugins are used to extend the Puth instance
 */
export default abstract class PuthInstancePlugin extends PuthPlugin {
  public static readonly PluginType = PuthPluginType.InstancePlugin;
  protected puth: Puth | undefined;

  public install(puth: Puth): void {
    this.puth = puth;
  }

  protected getPuth() {
    return this.puth;
  }
}
