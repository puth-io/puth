import Puth from './Server';
import { PuthPlugin, PuthPluginType } from './PuthPluginGeneric';

/**
 * PuthInstancePlugins are used to extend the Puth instance
 */
export default abstract class PuthInstancePlugin extends PuthPlugin {
  public static readonly PluginType = PuthPluginType.InstancePlugin;
  protected puth: Puth | undefined;

  public install(puth: Puth): PuthInstancePlugin {
    this.puth = puth;
    return this;
  }

  protected getPuth() {
    return this.puth;
  }
}
