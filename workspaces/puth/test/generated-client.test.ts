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

    it('chains calls', async () => {
        assert.strictEqual(await browser.setTimeout(100).visit(fixtureUrl()).assertTitle('Puth fixture'), browser);
    });

    it('ends a chain with a value', async () => {
        assert.strictEqual(await browser.visit(fixtureUrl()).title(), 'Puth fixture');
    });

    it('chains into generated objects', async () => {
        await browser.setContent(`<iframe id="frame" src="${fixtureUrl()}"></iframe>`);

        await browser.withinIframe('#frame').assertUrlIs(fixtureUrl());
    });

    it('stops a chain at the first failure', async () => {
        await browser.evaluate('window.chained = 0');

        await expect(
            browser
                .setTimeout(100)
                .assertUrlIs('http://not.the.url/')
                .evaluate('window.chained = 1'),
        ).rejects.toBeInstanceOf(ExpectationFailedError);
        assert.strictEqual(await browser.evaluate('window.chained'), 0);
    });

    it('returns screenshots as PNG bytes', async () => {
        const image = await browser.screenshot();

        assert.instanceOf(image, Uint8Array);
        assert.deepEqual([...image.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
    });

    it('chains from context creation', async () => {
        const created = Context.create(instance.http.url.replace(/\/$/, ''));

        try {
            await created.createBrowserShim().visit(fixtureUrl()).assertTitle('Puth fixture');
        } finally {
            await (await created).destroy({ immediately: true });
        }
    });

    it('returns values', async () => {
        assert.strictEqual(await browser.title(), 'Puth fixture');
        assert.strictEqual(await browser.evaluate('1 + 1'), 2);
    });

    it('applies the defaults of the server', async () => {
        await browser.setContent('<input id="focus">');

        await browser.click('#focus');

        assert.strictEqual(await browser.url(), fixtureUrl());
    });

    it('returns generated objects for known types', async () => {
        await browser.setContent(`<iframe id="frame" src="${fixtureUrl()}"></iframe>`);
        const frame = await browser.withinIframe('#frame');

        await frame.assertUrlIs(fixtureUrl());
    });

    it('returns dynamic handles for puppeteer objects', async () => {
        await browser.setContent('<input id="focus">');
        const element = await browser.firstOrFail('#focus');

        assert.strictEqual(await element.evaluate('(element) => element.id'), 'focus');
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

    it('creates a context from a URL', async () => {
        const fromUrl = await Context.create(instance.http.url.replace(/\/$/, ''));

        try {
            const shim = await fromUrl.createBrowserShim();
            await shim.visit(fixtureUrl());
            assert.strictEqual(await shim.title(), 'Puth fixture');
        } finally {
            await fromUrl.destroy({ immediately: true });
        }
    });
});
