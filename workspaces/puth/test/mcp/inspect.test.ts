import { existsSync } from 'node:fs';
import path from 'node:path';
import { assert, describe, it, vi } from 'vitest';
import { fixtureAltUrl } from '../helper';
import { directory, served, longPage, start } from './harness';

describe('puth_inspect', () => {
    const page = `data:text/html,${encodeURIComponent(`
        <title>Form</title><h1>Sign in</h1><p role="alert">Wrong password</p>
        <form id="login">
            <label for="email">Email address</label><input id="email" name="email" type="email" required value="a@b.c">
            <label>Password <input name="password" type="password" value="hunter2"></label>
            <select name="plan"><option value="free">Free</option><option value="pro" selected>Pro</option></select>
            <button>Sign in</button>
        </form>
        <div hidden><button>Hidden</button></div>
    `)}`;

    it('outlines the page with labels, structure and values', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId });

        assert.include(text, '# Sign in');
        assert.include(text, '! Wrong password');
        assert.include(text, 'input:email "Email address" #email ="a@b.c" required');
        assert.include(text, 'input:password "Password" input[name="password"]');
        assert.include(text, 'select "" select[name="plan"] ="pro" of free|pro');
        const [, ...lines] = text.split('\n');
        assert.notInclude(lines.join('\n'), 'hunter2');
        assert.notInclude(lines.join('\n'), 'Hidden');
    }, 20000);

    it('can look at a part of the page', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, selector: '#login' });

        assert.notInclude(text, '# Sign in');
        assert.include(text, '#email');
    }, 20000);

    it('bounds its output and says how to continue', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: served(longPage) });

        const first = await tool('puth_inspect', { sessionId, limit: 5 });
        const next = Number(first.text.match(/cursor=(\d+)/)![1]);
        const second = await tool('puth_inspect', { sessionId, limit: 5, cursor: next });

        assert.lengthOf(first.text.split('\n'), 8);
        assert.match(first.text.split('\n').at(-1), /^kinds: \d+ heading, .*\d+ button.*, filter with kind=$/);
        assert.notStrictEqual(first.text, second.text);
    }, 20000);

    it('searches the outline and the visible text', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, find: 'wrong' });

        assert.deepEqual(text.split('\n').slice(1), ['! Wrong password']);
    }, 20000);

    it('says when a search found nothing', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const { text } = await tool('puth_inspect', { sessionId, find: 'absent' });

        assert.deepEqual(text.split('\n').slice(1), ['no matches in the outline or visible text']);
    }, 20000);

    it('filters by kind', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        const buttons = (await tool('puth_inspect', { sessionId, kind: 'button' })).text.split('\n').slice(1);
        const signIn = (await tool('puth_inspect', { sessionId, kind: 'heading', find: 'sign' })).text.split('\n').slice(1);

        assert.lengthOf(buttons, 1);
        assert.match(buttons[0], /^button "Sign in" ~#login>button/);
        assert.deepEqual(signIn, ['# Sign in']);
    }, 20000);

    it('says where text is, preferring a stable selector', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: `data:text/html,${encodeURIComponent('<div id="status"><span>Saved</span></div>')}` });

        assert.deepEqual((await tool('puth_inspect', { sessionId, kind: 'text' })).text.split('\n').slice(1), ['"Saved" in #status']);
    }, 20000);

    it('does not count kinds when nothing was cut off', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.notInclude((await tool('puth_inspect', { sessionId })).text, 'kinds:');
    }, 20000);

    it('searches the visible text', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.strictEqual((await tool('puth_inspect', { sessionId, text: true, find: 'WRONG' })).text, 'Wrong password');
        assert.strictEqual((await tool('puth_inspect', { sessionId, text: true, find: 'absent' })).text, 'no matches in the visible text');
    }, 20000);

    it('returns the visible text on request', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: page });

        assert.include((await tool('puth_inspect', { sessionId, text: true })).text, 'Wrong password');
    }, 20000);

    it('reports an unknown part of the page', async () => {
        const { tool, session } = await start();

        assert.match((await tool('puth_inspect', { sessionId: await session(), selector: '#never' })).text, /^ERR INVALID_REQUEST/);
    }, 20000);
});

describe('Other browser tools', () => {
    it('select pages', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session({ url: served(`<a href="${fixtureAltUrl()}" target="_blank">Second origin</a>`) });
        await run(sessionId, { op: 'click', selector: 'a' });

        await vi.waitFor(async () => assert.lengthOf((await tool('puth_pages', { sessionId })).text.split('\n'), 2), { timeout: 3000 });
        const { text } = await tool('puth_pages', { sessionId, select: 1 });

        assert.include(text, '*1');
        assert.notOk((await run(sessionId, { op: 'see', text: 'Alternate origin' })).isError);
    }, 20000);

    it('return screenshots as images and artifacts', async () => {
        const { tool, session } = await start();
        const sessionId = await session({ url: served('<h1>Screenshot</h1><p>A page with more than the input.</p><input id="name">') });

        const { content, text } = await tool('puth_screenshot', { sessionId });
        const element = await tool('puth_screenshot', { sessionId, selector: '#name' });

        assert.strictEqual(content[0].type, 'image');
        assert.strictEqual(content[0].mimeType, 'image/jpeg');
        assert.isTrue(existsSync(text));
        assert.include(text, path.join(directory, sessionId));
        assert.isBelow(element.content[0].data.length, content[0].data.length);
    }, 20000);

    it('page through events of their own session only', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session({ url: undefined });
        const other = await session();
        const script = `<script>console.log('one'); console.log('two'); console.log('three'); console.error('bad')</script>`;
        await run(sessionId, { op: 'visit', url: `data:text/html,${encodeURIComponent(script)}` });

        await vi.waitFor(async () => assert.lengthOf((await tool('puth_events', { sessionId, type: 'console' })).text.split('\n'), 3));

        const first = await tool('puth_events', { sessionId, type: 'console', limit: 2 });
        const errors = await tool('puth_events', { sessionId, type: 'errors' });
        const network = await tool('puth_events', { sessionId: other, type: 'network' });

        assert.deepEqual(first.text.split('\n'), ['log one', 'log two', '… 1 more, cursor=2']);
        assert.include(errors.text, 'error bad');
        assert.include(network.text, '200 GET / document');
        assert.notInclude(network.text, 'bootstrap');
    }, 20000);

    it('show failed requests', async () => {
        const { tool, session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'evaluate', script: `fetch('http://127.0.0.1:9/gone').catch(() => 'failed')` });

        await vi.waitFor(async () => assert.include((await tool('puth_events', { sessionId, type: 'network' })).text, 'FAILED GET /gone net::ERR'));
    }, 20000);
});
