import { Puth } from 'puth';
import { RemoteContext } from './RemoteObject';
import { PuthPlugin, PuthPluginGeneric } from 'puth/src/PuthPluginGeneric';

export class LocalPuthClient {
    private readonly puth: Puth;
    private options: any;
    private assertionHandler: ((assertion: any) => any) | undefined;

    constructor(serverOptions?, clientOptions?) {
        this.puth = new Puth({
            server: false,
            logger: {
                info: () => {},
                error: () => {},
                warn: () => {},
                debug: () => {},
            },
            ...serverOptions,
        });
        this.options = clientOptions;
    }

    setAssertionHandler(assertionHandler: (assertion) => any) {
        this.assertionHandler = assertionHandler;
    }

    getAssertionHandler() {
        return this.assertionHandler;
    }

    getPuth() {
        return this.puth;
    }

    async contextCreate(options?) {
        return new RemoteContext(this, await this.puth.contextCreate(options), {
            debug: this.options?.debug,
        });
    }

    async contextCall(rpcPacket) {
        let {promise, resolve} = Promise.withResolvers();
        await this.puth.contextCall(rpcPacket, { resolve });
        return promise;
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

    contextDestroy(rpcPacket) {
        return this.puth.contextDestroy(rpcPacket);
    }

    use(plugin: PuthPluginGeneric<PuthPlugin>) {
        return this.puth.use(plugin);
    }
}
