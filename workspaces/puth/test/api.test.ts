import { describe, test as testBase, assert, expect } from 'vitest';
import { PuthStandardPlugin } from '../';
// import { RemotePuthClient } from '@puth/client';
import Constructors from '../src/context/Constructors';
import { makeLocalPuthClient, makePuthServer } from './helper';
import { sleep } from '../src/Utils';
import { RemotePuthClient } from './client/RemotePuthClient';

const envs: [string, () => [any, number?]][] = [
    ['local', () => [() => makeLocalPuthClient()]],
    [
        'remote',
        () => {
            let port = 10000 + Math.floor(Math.random() * 55535);
            return [() => new RemotePuthClient(process.env.PUTH_URL ?? `http://127.0.0.1:${port}`), port];
        },
    ],
];

if (process.env.TEST_ONLY_REMOTE) {
    puthContextTests(envs[1]);
} else if (process.env.TEST_ONLY_LOCAL) {
    puthContextTests(envs[0]);
} else {
    envs.forEach((env) => {
        puthContextTests(env);
    });
}

function puthContextTests(env) {
    const test = testBase.extend({
        puth: async ({ task }, use) => {
            let remoteInstance;
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

            await use({ remote, context, browser, page });

            if (env[0] === 'remote') {
                await remoteInstance.destroy();
            } else {
                await remote.destroy();
            }
        },
    });

    describe(`Api [${env[0]}]`, () => {
        test.concurrent(`create/destroy context`, async ({ puth: { remote, context } }) => {
            let rep = context.representation;
            assert.ok('id' in rep && 'type' in rep);
            await expect(context.destroy()).resolves.toBeTruthy();
        });

        describe.concurrent('Browser', () => {
            test.concurrent('create', async ({ puth: { remote, context, browser } }) => {
                let rep = await browser.getRepresentation();
                assert.containsAllKeys(rep, ['id', 'type']);
                assert.strictEqual(rep?.represents, Constructors.BrowserContext);
                await expect(context.destroy()).resolves.toBeTruthy();
            });

            test.concurrent('visit', async ({ puth: { remote, context, page } }) => {
                await page.visit('https://playground.puth.dev');
                assert.strictEqual(await page.url(), 'https://playground.puth.dev/');
                await expect(context.destroy()).resolves.toBeTruthy();
            });
        });

        describe('RemoteContext', () => {
            test.concurrent('can set and get property', async ({ puth: { page } }) => {
                page.___set_test = true;
                await sleep(500);
                await expect(page._getProperty('___set_test')).resolves.toBeTruthy();
            });
            
            test.concurrent('can delete property', async ({ puth: { page } }) => {
                page.___delete_test = true;
                await expect(page._getProperty('___delete_test')).resolves.toBeTruthy();
                delete page.___delete_test;
                await sleep(500);
                await expect(page._getProperty('___delete_test')).rejects.toThrowError();
            });
        });
    });
}
