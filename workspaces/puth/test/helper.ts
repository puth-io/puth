import { assert } from 'vitest';
import { Puth, usableBrowserInstallations, PuthStandardPlugin } from '../';
import { LocalPuthClient } from './client/LocalPuthClient';
import { RemotePuthClient } from './client/RemotePuthClient';

export const installedBrowser = usableBrowserInstallations[0];

export function makeLocalPuthClient() {
    return new LocalPuthClient({ installedBrowser });
}

export function makePuthServer(port, address) {
    let instance = new Puth({
        installedBrowser,
        logger: {
            info: () => {},
            error: () => {},
            warn: () => {},
            debug: () => {},
        },
        disableCors: true,
    });
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

export function multiTest(callback, extended = false) {
    const envs: [string, () => any][] = [
        ['remote', () => new RemotePuthClient(process.env.PUTH_URL ?? 'http://127.0.0.1:43210')],
        ['local', () => makeLocalPuthClient()],
    ];

    if (process.env.TEST_ONLY_REMOTE) {
        callback(envs[0]);
    } else if (process.env.TEST_ONLY_LOCAL) {
        callback(envs[1]);
    } else {
        envs.forEach(async function (env) {
            before(function () {
                if (env[0] === 'remote' && !process.env.PUTH_URL) {
                    this.__remoteTestInstance = makePuthServer(43210, '127.0.0.1');
                }
            });

            after(async function () {
                if (env[0] === 'remote') {
                    await this.__remoteTestInstance?.http?.close();
                }
            });

            beforeEach(async function () {
                this.remote = env[1]();

                if (env[0] === 'local') {
                    this.remote.use(PuthStandardPlugin);
                }

                this.context = await this.remote.contextCreate({
                    snapshot: true,
                });

                if (extended) {
                    this.remote.setAssertionHandler((assertion) => {
                        if (!assertion.result) {
                            assert.fail(assertion.message);
                        }
                    });
                    this.puthAssertStrictEqual = async (handle1, handle2) => {
                        let response = await this.context.assertStrictEqual(
                            await handle1.getRepresentation(),
                            await handle2.getRepresentation(),
                        );
                        return assert.ok(response.result, 'handle1 and handle2 are not equal');
                    };
                    this.browser = await this.context.createBrowser();
                    this.page = (await this.browser.pages())[0];
                }
            });

            afterEach(async function () {
                await this.context.destroy({ immediately: true });
            });

            callback(env);
        });
    }
}
