import { afterEach, assert, describe, expect, it, vi } from 'vitest';
import { fixtureUrl, makeLocalPuthClient } from './helper';
import { Browser } from '../src/shims/Browser';
import { PuthStandardPlugin } from '../src/plugins/PuthStandardPlugin';

const clients: any[] = [];

afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.destroy()));
});

async function open(html?: string) {
    const client = makeLocalPuthClient();
    clients.push(client);
    client.use(PuthStandardPlugin);

    let context!: any;
    client.getPuth().on('context:created', (event) => { context = event.context; });
    const remote = await client.contextCreate();
    const browser = await remote.createBrowserShim();
    await browser.setTimeout(1500);
    await browser.visit(fixtureUrl('/plain.txt'));
    if (html !== undefined) {
        await browser.setContent(html);
    }

    return { client, browser, context };
}

const later = (ms: number, script: string) => `setTimeout(() => { ${script} }, ${ms})`;
const clicks = (browser) => browser.evaluate('window.clicks ?? 0');
const counter = `<script>window.clicks = 0</script>`;

describe('Assertions', () => {
    it('retry until they pass', async () => {
        const { browser } = await open('<title>before</title>');

        await browser.evaluate(later(300, `document.title = 'after'`));

        await browser.assertTitle('after');
    });

    it('fail with the last result after their timeout', async () => {
        const { browser } = await open('<title>before</title>');
        await browser.setTimeout(200);
        const startedAt = Date.now();

        await expect(browser.assertTitle('after')).rejects.toThrow('does not equal actual title [before]');

        assert.isAtLeast(Date.now() - startedAt, 200);
    });
});

describe('Reads', () => {
    it('wait for their element across a page load', async () => {
        const { browser } = await open();

        await browser.evaluate(later(0, `location.href = ${JSON.stringify(fixtureUrl('/slow?ms=200'))}`));

        assert.strictEqual(await browser.text('#slow'), 'Slow page');
    });
});

describe('Page transitions', () => {
    it('pause the next call until the following page loaded', async () => {
        const url = fixtureUrl('/slow?ms=400');
        const { browser } = await open(`<a id="link" href="${url}">next</a>`);

        await browser.click('#link');

        assert.strictEqual(await browser.evaluate('document.title'), 'Slow page');
    });

    it('do not hold back calls on an idle page', async () => {
        const { browser } = await open('<p>idle</p>');
        const startedAt = Date.now();

        for (let i = 0; i < 10; i++) {
            await browser.evaluate('1 + 1');
        }

        assert.isBelow(Date.now() - startedAt, 2000);
    });
});

describe('Actionability', () => {
    const button = (attributes = '', style = '') =>
        `${counter}<button id="target" ${attributes} style="${style}" onclick="window.clicks++">Go</button>`;

    it('waits for an element to become visible', async () => {
        const { browser } = await open(button('', 'display: none'));

        await browser.evaluate(later(200, `document.querySelector('#target').style.display = 'block'`));
        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it('waits for an element to become enabled', async () => {
        const { browser } = await open(button('disabled'));

        await browser.evaluate(later(200, `document.querySelector('#target').disabled = false`));
        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it('waits for an element to stop being covered', async () => {
        const { browser } = await open(`${button()}<div id="cover" style="position: fixed; inset: 0"></div>`);

        await browser.evaluate(later(200, `document.querySelector('#cover').remove()`));
        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it('waits for an element to stop moving', async () => {
        const { browser } = await open(button('', 'position: fixed; top: 0; left: 0'));

        await browser.evaluate(`(() => {
            const target = document.querySelector('#target');
            let left = 0;
            const move = setInterval(() => { target.style.left = (left += 15) + 'px'; }, 10);
            setTimeout(() => clearInterval(move), 300);
        })()`);
        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it('scrolls elements into view', async () => {
        const { browser } = await open(`<div style="height: 4000px"></div>${button()}`);

        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it('re-resolves an element that was replaced', async () => {
        const { browser } = await open(button('disabled'));

        await browser.evaluate(later(200, `
            document.querySelector('#target').outerHTML = '<button id="target" onclick="window.clicks++">New</button>';
        `));
        await browser.click('#target');

        assert.strictEqual(await clicks(browser), 1);
    });

    it.each([
        ['hidden', button('', 'visibility: hidden'), 'it is not visible'],
        ['disabled', button('disabled'), 'it is disabled'],
        ['covered', `${button()}<div id="cover" style="position: fixed; inset: 0"></div>`, 'it is covered by <div#cover>'],
    ])('says why a %s element can not be clicked', async (_, html, reason) => {
        const { browser } = await open(html);
        await browser.setTimeout(200);

        await expect(browser.click('#target')).rejects.toThrow(`Element [#target] is not actionable: ${reason}.`);
    });

    it('refuses to type into a readonly input until it is editable', async () => {
        const { browser } = await open('<input id="field" readonly>');
        await browser.setTimeout(200);

        await expect(browser.type('#field', 'text')).rejects.toThrow('it is readonly');
    });

    it('accepts force to skip the checks', async () => {
        const { browser } = await open(`${button()}<div style="position: fixed; inset: 0"></div>`);
        await browser.setTimeout(200);

        await browser.click('#target', { force: true });
    });

    it('does not repeat an action that navigated', async () => {
        const url = fixtureUrl('/slow?ms=100');
        const { browser } = await open(`${counter}<a id="link" href="${url}" onclick="sessionStorage.clicks = (+sessionStorage.clicks || 0) + 1">next</a>`);

        await browser.click('#link');
        await browser.waitFor('#slow');

        assert.strictEqual(await browser.evaluate('+sessionStorage.clicks'), 1);
    });
});

describe('Actions on a closing page', () => {
    async function popup() {
        const session = await open(`<a id="open" href="${fixtureUrl('/closable')}" target="_blank">open</a>`);
        await session.browser.click('#open');

        const page = await vi.waitFor(async () => {
            const pages = await session.context.browsers[0].context.pages();
            const found = pages.find((candidate) => candidate.url().includes('/closable'));
            assert.isDefined(found);
            return found;
        }, { timeout: 3000 });

        const shim = new Browser(session.context.browsers[0], page, { timeout: 1000 });
        const representation = session.context.returnCached(shim);
        const call = (name: string, ...parameters: any[]) => session.client.contextCall({
            context: { id: session.context.id },
            ...representation,
            function: name,
            parameters,
        });

        return { ...session, page, call };
    }

    it('succeed when the action closed the page', async () => {
        const { call, page } = await popup();

        const response: any = await call('click', '#close');

        assert.notStrictEqual(response?.type, 'error');
        assert.notStrictEqual(response?.type, 'ExpectationFailed');
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.isTrue(page.isClosed());
    }, 15000);

    it('fail when the page closed before the action happened', async () => {
        const { call, page } = await popup();

        const pending = call('click', '#never-rendered');
        await new Promise((resolve) => setTimeout(resolve, 100));
        await page.close();

        expect(await pending).toMatchObject({ code: 'PageClosed' });
    }, 15000);
});
