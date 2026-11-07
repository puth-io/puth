import { type Browser, Context, ExpectationFailedError, RemotePuthClient } from '@puth/client';
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest';
import { fixtureUrl, makePuthServer } from './helper';

describe('Generated client', () => {
    let instance;
    let context: Context;
    let browser: Browser;

    beforeEach(async () => {
        instance = makePuthServer(0, '127.0.0.1');
        await instance.http.ready();

        context = await Context.create(new RemotePuthClient(instance.http.url.replace(/\/$/, '')));
        browser = await context.createBrowserShim();
        await browser.visit(fixtureUrl());
    });

    afterEach(async () => {
        await context.destroy({ immediately: true });
        await instance.destroy();
    });

    it('returns itself from fluent methods', async () => {
        assert.strictEqual(await browser.setTimeout(100), browser);
    });

    it('returns values', async () => {
        assert.strictEqual(await browser.title(), 'Playground | Puth');
        assert.strictEqual(await browser.evaluate('1 + 1'), 2);
    });

    it('applies the defaults of the server', async () => {
        await browser.click('#actions-focus');

        assert.strictEqual(await browser.url(), fixtureUrl());
    });

    it('returns generated objects for known types', async () => {
        const frame = await browser.withinIframe('#iframe-example');

        await frame.assertUrlIs(fixtureUrl());
    });

    it('returns dynamic handles for puppeteer objects', async () => {
        const element = await browser.firstOrFail('#actions-focus');

        assert.strictEqual(await element.evaluate('(element) => element.id'), 'actions-focus');
    });

    it('passes generated objects as references', () => {
        assert.deepEqual(JSON.parse(JSON.stringify([browser])), [browser.getRepresentation()]);
    });

    it('rejects failed expectations', async () => {
        await browser.setTimeout(100);

        await expect(browser.assertUrlIs('http://not.the.url/')).rejects.toBeInstanceOf(ExpectationFailedError);
    });

    it('rejects errors', async () => {
        await expect(browser.evaluate('throw new Error("broken")')).rejects.toThrow('broken');
    });

    it('calls context methods', async () => {
        const path = await context.saveTemporaryFile('file.txt', btoa('content'));

        assert.include(path, 'file.txt');
    });
});
