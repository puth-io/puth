import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixtureUrl, makeLocalPuthClient } from './helper';
import { PuthStandardPlugin } from '../src/plugins/PuthStandardPlugin';

// An action that navigates, followed by an action on a field that exists on both documents. If the second action ran
// against the old document, the typed text is lost with it. ACTION_SETTLE_REPEAT=200 repeats each sequence for a
// measurement, ACTION_SETTLE sets timeouts.actionSettle.
const REPEAT = Number(process.env.ACTION_SETTLE_REPEAT ?? 10);
const ACTION_SETTLE = process.env.ACTION_SETTLE === undefined ? undefined : Number(process.env.ACTION_SETTLE);

const navigations: [string, string, boolean][] = [
    ['a submitted form', '#submit', true],
    ['a followed link', '#link', true],
    ['an assignment in a click handler', '#assign', true],
    // The page announces this navigation only after the action returned, so it needs a wait or an assertion.
    ['an assignment in a timer of a click handler', '#later', false],
];

let client: any;
let browser: any;

beforeAll(async () => {
    client = makeLocalPuthClient();
    client.use(PuthStandardPlugin);
    const timeouts = ACTION_SETTLE === undefined ? {} : { actionSettle: ACTION_SETTLE };
    const remote = await client.contextCreate({ timeouts });
    browser = await remote.createBrowserShim();
    await browser.setTimeout(2000);
});

afterAll(async () => {
    await client?.destroy();
});

describe.each([0, 50])('An action after a navigation answered after %sms', (ms) => {
    it.each(navigations)('reaches the next document after %s', async (_, trigger, announced) => {
        const lost: number[] = [];

        for (let run = 0; run < REPEAT; run++) {
            await browser.visit(fixtureUrl(`/form?step=1&ms=${ms}`));
            await browser.click(trigger);

            try {
                if (! announced) {
                    await browser.assertTitle('Step 2');
                }
                await browser.type('#name', 'typed');
                await browser.assertTitle('Step 2');
                if (await browser.evaluate(`document.querySelector('#name').value`) !== 'typed') {
                    lost.push(run);
                }
            } catch {
                lost.push(run);
            }
        }

        expect(lost, `the typed text did not reach the next document in ${lost.length} of ${REPEAT} runs`).toEqual([]);
    }, 5000 + REPEAT * 1000);
});
