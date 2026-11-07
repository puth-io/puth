import { afterEach, describe, expect, it } from 'vitest';
import { fixtureAltUrl, fixtureUrl, makeLocalPuthClient } from './helper';
import { PuthStandardPlugin } from '../src/plugins/PuthStandardPlugin';

const clients: any[] = [];

afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.destroy()));
});

async function openBrowser() {
    const client = makeLocalPuthClient();
    clients.push(client);
    client.use(PuthStandardPlugin);

    const puth = client.getPuth();
    let context!: any;
    puth.on('context:created', (event) => { context = event.context; });
    const remote = await client.contextCreate();
    const browser = await remote.createBrowserShim();
    const representation = await browser.getRepresentation();

    // Reads what the server answered, to tell the kinds of failures apart.
    const call = (name: string, ...parameters: any[]): Promise<any> => client.contextCall({
        context: { id: context.id },
        ...representation,
        function: name,
        parameters,
    });

    return { browser, call, context: () => context };
}

// The page behind the shim, which the client does not expose.
const serverPage = (context) => [...context.callStacks.keys()][0];

describe('Calls during navigation', () => {
    it('never passes a false assertion while the page reloads', async () => {
        const { browser, call } = await openBrowser();
        await browser.setTimeout(300);
        await browser.visit(fixtureUrl('/reloading'));

        for (let i = 0; i < 15; i++) {
            expect(await call('assertSourceHas', 'text-that-does-not-exist')).toMatchObject({ type: 'ExpectationFailed' });
        }
    }, 30000);

    it('finishes an assertion that runs into a navigation', async () => {
        const { browser, call } = await openBrowser();
        await browser.visit(fixtureUrl());

        for (let i = 0; i < 10; i++) {
            await browser.evaluate(`setTimeout(() => { location.href = ${JSON.stringify(fixtureAltUrl())} }, 0)`);
            expect(await call('assertUrlIs', fixtureAltUrl())).not.toMatchObject({ type: 'ExpectationFailed' });
            expect(await call('assertSourceHas', 'Alternate origin')).not.toMatchObject({ type: 'ExpectationFailed' });
            await browser.visit(fixtureUrl());
        }
    }, 30000);

    it('still reports a failed assertion after the page settled', async () => {
        const { browser, call } = await openBrowser();
        await browser.setTimeout(300);
        await browser.visit(fixtureUrl());

        const response = await call('assertUrlIs', fixtureAltUrl());

        expect(response.type).toBe('ExpectationFailed');
        expect(response.value.message).toContain('does not equal expected URL');
    });

    it('does not repeat an action when the page navigates during it', async () => {
        const { browser, call } = await openBrowser();
        await browser.visit(fixtureUrl());

        await browser.evaluate(`location.href = ${JSON.stringify(fixtureAltUrl())}`);

        expect(await call('assertUrlIs', fixtureAltUrl())).not.toMatchObject({ type: 'ExpectationFailed' });
    });
});

describe('Calls on a closing page', () => {
    it('fails a pending wait', async () => {
        const { browser, call, context } = await openBrowser();
        await browser.visit(fixtureUrl());

        const pending = call('waitFor', '#never-rendered', 20000);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await serverPage(context()).close();

        const response = await pending;
        expect({ code: response.code, message: response.message }).toMatchObject({ code: 'PageClosed' });
    }, 15000);

    it('fails a pending call that is not an assertion or wait', async () => {
        const { browser, call, context } = await openBrowser();
        await browser.visit(fixtureUrl());

        const pending = call('evaluate', 'new Promise(() => {})');
        await new Promise((resolve) => setTimeout(resolve, 100));
        await serverPage(context()).close();

        expect((await pending).code).toBe('PageClosed');
    }, 15000);

    it('lets a call succeed that closes the page on purpose', async () => {
        const { browser } = await openBrowser();
        await browser.visit(fixtureUrl());

        await browser.quit();
    });
});
