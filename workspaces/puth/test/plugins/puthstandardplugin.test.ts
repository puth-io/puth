import { describe, assert, beforeEach } from 'vitest';
import { testLocal } from '../helper';

describe(`PuthStandardPlugin`, () => {
    beforeEach(async ({ puth: { page } }) => {
        await page.goto('https://playground.puth.dev/');
    });

    testLocal('should get page title', async function ({ puth: { page } }) {
        assert.strictEqual(await page.title(), 'Playground | Puth');
    });

    testLocal('should get page title', async function ({ puth: { page } }) {
        assert.strictEqual(await page.url(), 'https://playground.puth.dev/');
    });

    describe('ElementHandle', function () {
        testLocal('should get page title', async function ({ puth: { page } }) {
            assert.strictEqual(await page.$('#properties-value input').value(), 'input with value');
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            assert.strictEqual(await page.$('#properties-value textarea').value(), 'textarea with value');
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            assert.strictEqual(await page.$('#properties-value select').value(), 'apple');
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            assert.strictEqual(await page.$('#properties-innertext').innerText(), 'div with this innertext');
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            assert.strictEqual(
                await page.$('#properties-innerhtml').innerHTML(),
                '<div>child div</div> with this innerhtml',
            );
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            let input = await page.$('#actions-clear').clear();
            assert.strictEqual(await input.value(), '');
        });

        testLocal('should get page title', async function ({ puth: { page, assertHandleEquals } }) {
            let focused = await page.$('#actions-focus').focus();
            await assertHandleEquals(focused, await page.focused());
        });

        testLocal('should get page title', async function ({ puth: { page, assertHandleEquals } }) {
            await page.focus('#actions-focus');
            await assertHandleEquals(await page.$('#actions-focus'), await page.focused());
        });

        testLocal('should get page title', async function ({ puth: { page, assertHandleEquals } }) {
            await page.$('#actions-focus').focus().blur();
            await assertHandleEquals(await page.$('body'), await page.focused());
        });

        testLocal('should get page title', async function ({ puth: { page, assertHandleEquals } }) {
            await page.focus('#actions-focus').blur('#actions-focus');
            await assertHandleEquals(await page.$('body'), await page.focused());
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            let input = await page.$('#actions-type input').type('puth test verify').clear();
            assert.strictEqual(await input.value(), '');
        });

        testLocal('should get page title', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            await page.$('#actions-click button').click();
            assert.strictEqual(await page.$('#actions-click-verify').innerText(), 'clicked button');
        });
    });
});
