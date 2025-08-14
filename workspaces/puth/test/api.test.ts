import { describe, test as testBase, assert, expect } from 'vitest';
import { PuthStandardPlugin } from '../';
// import { RemotePuthClient } from '@puth/client';
import Constructors from '../src/context/Constructors';
import { makeLocalPuthClient, makePuthServer } from './helper';
import { sleep } from '../src/Utils';
import { RemotePuthClient } from './client/RemotePuthClient';


const envs: [string, () => [any, number?]][] = [
    ['local', () => [() => makeLocalPuthClient()]],
    ['remote', () => {
        let port = 10000 + Math.floor(Math.random() * 55535);
        return [() => new RemotePuthClient(process.env.PUTH_URL ?? `http://127.0.0.1:${port}`), port];
    }],
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

            await use({ remote, context });

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
            test.concurrent('create', async ({ puth: { remote, context } }) => {
                let rep = await (await context.createBrowser()).getRepresentation();
                assert.containsAllKeys(rep, ['id', 'type']);
                assert.strictEqual(rep?.represents, Constructors.BrowserContext);
                await expect(context.destroy()).resolves.toBeTruthy();
            });

            test.concurrent('visit', async ({ puth: { remote, context } }) => {
                let browser = await context.createBrowser();

                let page = (await browser.pages())[0];
                await page.visit('https://playground.puth.dev');

                assert.strictEqual(await page.url(), 'https://playground.puth.dev/');
                await expect(context.destroy()).resolves.toBeTruthy();
            });
        });
        //
        //     describe('RemoteContext', function () {
        //       beforeEach(async function () {
        //         this.browser = await this.context.createBrowser();
        //         this.page = (await this.browser.pages())[0];
        //       });
        //
        //       afterEach(async function () {
        //         await this.page.close();
        //         await this.context.destroy();
        //       });
        //
        //       it('can set and get property', async function () {
        //         this.page.___set_test = true;
        //         assert.ok((await this.page._getProperty('___set_test')) === true);
        //       });
        //
        //       it('can delete property', async function () {
        //         this.page.___delete_test = true;
        //         assert.ok(await this.page._getProperty('___delete_test'));
        //         delete this.page.___delete_test;
        //         await sleep(500);
        //         await assert.isRejected(this.page._getProperty('___delete_test'));
        //       });
        //     });
    });
}
