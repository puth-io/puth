import { describe, assert, expect } from 'vitest';
import { envs, fixtureUrl, testFn } from './helper';
import { Constructors } from '@puth/core';

const selectedEnvs = process.env.TEST_ONLY_REMOTE ? [envs[1]] : process.env.TEST_ONLY_LOCAL ? [envs[0]] : envs;

selectedEnvs.forEach((env) => {
    puthContextTests(env);
});

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
                await page.visit(fixtureUrl());
                assert.strictEqual(await page.url(), fixtureUrl());
                await expect(context.destroy()).resolves.toBeTruthy();
            });
        });

        describe('RemoteContext', () => {
            test.concurrent('can set and get property', async ({ puth: { page } }) => {
                await page._setProperty('___set_test', true);
                await expect(page._getProperty('___set_test')).resolves.toBeTruthy();
            });
            
            test.concurrent('can delete property', async ({ puth: { page } }) => {
                await page._setProperty('___delete_test', true);
                await expect(page._getProperty('___delete_test')).resolves.toBeTruthy();
                await page._deleteProperty('___delete_test');
                await expect(page._getProperty('___delete_test')).rejects.toThrowError();
            });
        });
    });
}

describe('Failed expectations', () => {
    selectedEnvs.forEach((env) => {
        const test = testFn(env);

        test(`reject the call [${env[0]}]`, async ({ puth: { context } }) => {
            const browser = await context.createBrowserShim();
            await browser.setTimeout(100);
            await browser.visit(fixtureUrl());

            await expect(browser.assertUrlIs('http://not.the.url/')).rejects.toMatchObject({
                name: 'ExpectationFailedError',
                message: expect.stringContaining('does not equal expected URL'),
                expected: 'http://not.the.url/',
            });
        });
    });
});
