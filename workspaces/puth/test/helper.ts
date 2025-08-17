import { assert } from 'vitest';
import { Puth, usableBrowserInstallations, PuthStandardPlugin } from '../';
import { LocalPuthClient } from './client/LocalPuthClient';
import { RemotePuthClient } from './client/RemotePuthClient';
import { test as testBase } from '@vitest/runner';

export const envs: [string, () => [any, number?]][] = [
    ['local', () => [() => makeLocalPuthClient()]],
    [
        'remote',
        () => {
            let port = 10000 + Math.floor(Math.random() * 55535);
            return [() => new RemotePuthClient(process.env.PUTH_URL ?? `http://127.0.0.1:${port}`), port];
        },
    ],
];

export const testFn = env => testBase.extend({
    puth: async ({ task }, use) => {
        let remoteInstance: Puth;
        const config = env[1]();
        
        if (env[0] === 'remote' && !process.env.PUTH_URL) {
            remoteInstance = makePuthServer(config[1], '127.0.0.1');
        }
        let remote = config[0]();
        if (env[0] === 'local') {
            remote.use(PuthStandardPlugin);
        }
        let context = await remote.contextCreate({
            snapshot: true,
        });
        let browser = await context.createBrowser();
        let page = (await browser.pages())[0];
        
        const assertHandleEquals = async (handle1, handle2) => {
            let response = await context.assertStrictEqual(
                await handle1.getRepresentation(),
                await handle2.getRepresentation(),
            );
            return assert.ok(response.result, 'handle1 and handle2 are not equal');
        }
        
        await use({ remote, context, browser, page, assertHandleEquals });
        
        if (env[0] === 'remote' && !process.env.PUTH_URL) {
            await remoteInstance.destroy();
        }
        if (env[0] === 'local') {
            await remote.destroy();
        }
    },
});

export const testLocal = testFn(envs[0]);

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
        cors: { enabled: false },
    });
    instance.use(PuthStandardPlugin);
    instance.serve(port, address);
    return instance;
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
