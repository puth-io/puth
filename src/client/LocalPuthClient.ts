import { RemoteContext } from './RemoteObject';
import { Puth, Puth as PuthServer } from '../server/Server';
import { PuthPlugin, PuthPluginGeneric } from '../server/src/PuthPluginGeneric';

export class LocalPuthClient {
  private readonly puth: Puth;
  private options: any;

  constructor(serverOptions?, clientOptions?) {
    this.puth = new PuthServer({
      server: false,
      ...serverOptions,
    });
    this.options = clientOptions;
  }

  getPuth() {
    return this.puth;
  }

  async contextCreate(options?) {
    return new RemoteContext(this, await this.puth.contextCreate(options), { debug: this.options?.debug });
  }

  contextCall(rpcPacket) {
    return this.puth.contextCall(rpcPacket);
  }

  contextGet(rpcPacket) {
    return this.puth.contextGet(rpcPacket);
  }

  contextSet(rpcPacket) {
    return this.puth.contextSet(rpcPacket);
  }

  contextDelete(rpcPacket) {
    return this.puth.contextDelete(rpcPacket);
  }

  use(plugin: PuthPluginGeneric<PuthPlugin>) {
    return this.puth.use(plugin);
  }
}
