import { describe, assert, expect } from 'vitest';
import { envs, testFn } from './helper';
import { Constructors } from '@puth/core';
import { sleep } from '../src/Utils';

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
    const test = testFn(env);

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
