import { describe, test as testBase, assert, expect } from 'vitest';
import { PuthStandardPlugin } from '../';
// import { RemotePuthClient } from '@puth/client';
import Constructors from '../src/context/Constructors';
import { makeLocalPuthClient, makePuthServer } from './helper';
import { sleep } from '../src/Utils';
import { RemotePuthClient } from './client/RemotePuthClient';

const envs: [string, () => any][] = [
    ['local', () => makeLocalPuthClient()],
    ['remote', () => new RemotePuthClient(process.env.PUTH_URL ?? 'http://127.0.0.1:43210')],
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
    let remoteInstance;

    const test = testBase.extend({
        puth: async ({ task }, use) => {
            if (env[0] === 'remote' && !process.env.PUTH_URL) {
                remoteInstance = makePuthServer(43210, '127.0.0.1');
            }
            let remote = env[1]();
            if (env[0] === 'local') {
                remote.use(PuthStandardPlugin);
            }

            let context = await remote.contextCreate({
                snapshot: true,
            });

            await use({ remote, context });

            if (env[0] === 'remote') {
                await remoteInstance.http.close();
            }
        },
    });

    describe(`Api [${env[0]}]`, () => {
        test(`can create/destroy context`, async ({ puth: { remote, context } }) => {
            let rep = context.representation;
            assert.ok('id' in rep && 'type' in rep);
            await expect(context.destroy()).resolves.toBeTruthy();
        });

        test('can call a function', async ({ puth: { remote, context } }) => {
            let rep = await (await context.createBrowser()).getRepresentation();
            assert.containsAllKeys(rep, ['id', 'type']);
            assert.strictEqual(rep?.represents, Constructors.BrowserContext);
            await expect(context.destroy()).resolves.toBeTruthy();
        });
        //
        //     describe('Browser', function () {
        //       it('can visit site', async function () {
        //         let browser = await this.context.createBrowser();
        //
        //         let page = (await browser.pages())[0];
        //         await page.visit('https://playground.puth.dev');
        //
        //         assert.strictEqual(await page.url(), 'https://playground.puth.dev/');
        //         assert.isFulfilled(this.context.destroy());
        //       });
        //     });
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
