import Puth, {installedBrowsers, PuthStandardPlugin} from '../';
import LocalPuthClient from '@puth/client/LocalPuthClient';
import * as assert from "assert";

export const installedBrowser = installedBrowsers[0];

export function makeLocalPuthClient() {
    return new LocalPuthClient({installedBrowser});
}

export function makePuthServer(port, address) {
    let instance = new Puth({installedBrowser});
    instance.use(PuthStandardPlugin);
    instance.serve(port, address);
    return instance;
}

export async function puthContextBinder(mochaContext, plugins: any = []) {
    mochaContext.remote = makeLocalPuthClient();
    for (let plugin of plugins) {
        mochaContext.remote.use(plugin);
    }
    mochaContext.remote.setAssertionHandler((assertion) => {
        if (!assertion.result) {
            assert.fail(assertion.message);
        }
    });
    mochaContext.context = await mochaContext.remote.contextCreate({
        snapshot: true,
        track: ['commands', 'console', 'network'],
    });
    mochaContext.browser = await mochaContext.context.createBrowser();
    mochaContext.page = (await mochaContext.browser.pages())[0];
    mochaContext.puthAssertStrictEqual = async (handle1, handle2) => {
        let response = await mochaContext.context.assertStrictEqual(
            await handle1.getRepresentation(),
            await handle2.getRepresentation(),
        );
        return assert.ok(response.result, 'handle1 and handle2 are not equal');
    };
}
