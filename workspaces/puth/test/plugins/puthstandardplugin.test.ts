import { describe, assert } from 'vitest';
import { fixtureUrl, testLocal } from '../helper';

describe(`PuthStandardPlugin`, () => {
    testLocal('reads the title and URL of the page', async function ({ puth: { page } }) {
        await page.goto(fixtureUrl());

        assert.strictEqual(await page.title(), 'Puth fixture');
        assert.strictEqual(await page.url(), fixtureUrl());
    });

    describe('ElementHandle', function () {
        testLocal('reads the value of inputs, textareas and selects', async function ({ puth: { page } }) {
            await page.setContent(`
                <input value="input with value">
                <textarea>textarea with value</textarea>
                <select><option value="apple" selected>selected apple</option></select>
            `);

            assert.strictEqual(await page.$('input').value(), 'input with value');
            assert.strictEqual(await page.$('textarea').value(), 'textarea with value');
            assert.strictEqual(await page.$('select').value(), 'apple');
        });

        testLocal('reads innerText and innerHTML', async function ({ puth: { page } }) {
            await page.setContent('<div id="text">div with this innertext</div><div id="html"><div>child div</div> with this innerhtml</div>');

            assert.strictEqual(await page.$('#text').innerText(), 'div with this innertext');
            assert.strictEqual(await page.$('#html').innerHTML(), '<div>child div</div> with this innerhtml');
        });

        testLocal('clears an input', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            await page.setContent('<input value="text to clear">');

            let input = await page.$('input').clear();
            assert.strictEqual(await input.value(), '');
        });

        testLocal('types into an input and clears it', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            await page.setContent('<input>');

            let input = await page.$('input').type('puth test verify').clear();
            assert.strictEqual(await input.value(), '');
        });

        testLocal('focuses an element', async function ({ puth: { page, assertHandleEquals } }) {
            await page.setContent('<input id="focus">');

            let focused = await page.$('#focus').focus();
            await assertHandleEquals(focused, await page.focused());
        });

        testLocal('focuses an element by selector', async function ({ puth: { page, assertHandleEquals } }) {
            await page.setContent('<input id="focus">');

            await page.focus('#focus');
            await assertHandleEquals(await page.$('#focus'), await page.focused());
        });

        testLocal('blurs a focused element', async function ({ puth: { page, assertHandleEquals } }) {
            await page.setContent('<input id="focus">');

            await page.$('#focus').focus().blur();
            await assertHandleEquals(await page.$('body'), await page.focused());
        });

        testLocal('blurs a focused element by selector', async function ({ puth: { page, assertHandleEquals } }) {
            await page.setContent('<input id="focus">');

            await page.focus('#focus').blur('#focus');
            await assertHandleEquals(await page.$('body'), await page.focused());
        });

        testLocal('clicks', async function ({ puth: { page } }) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            await page.setContent(`<button onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button><p id="verify"></p>`);

            await page.$('button').click();
            assert.strictEqual(await page.$('#verify').innerText(), 'clicked button');
        });

        testLocal('double clicks', async function ({ puth: { page } }) {
            await page.setContent(`<button ondblclick="document.querySelector('#verify').innerText = 'double clicked button'">double click</button><p id="verify"></p>`);

            await page.$('button').doubleClick();
            assert.strictEqual(await page.$('#verify').innerText(), 'double clicked button');
        });
    });
});
