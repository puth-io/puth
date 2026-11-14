import { assert, describe, it } from 'vitest';
import { fixtureAltUrl } from '../helper';
import { cli, served, clickPage, longPage, start } from './harness';

describe('puth_run', () => {
    it('runs steps in one call and reports only what changed', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served('<title>Form</title><input id="name">') });

        const { text, isError } = await run(
            sessionId,
            { op: 'type', selector: '#name', text: 'hello' },
            { op: 'value', selector: '#name', value: 'hello' },
        );

        assert.notOk(isError);
        assert.match(text, /^ok 2/);
        assert.include(text, '=\\"hello\\"'.replace(/\\/g, ''));
        assert.notInclude(text, 'Form');
        assert.isBelow(text.split('\n').length, 5);
    }, 20000);

    it('reports text that appeared', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { text } = await run(sessionId, { op: 'click', selector: '#go' });

        assert.include(text, '+ "clicked button" in #verify');
    }, 20000);

    it('shows the start of a new page and how to read on', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: fixtureAltUrl() });

        const { text } = await run(sessionId, { op: 'visit', url: served(longPage) });

        assert.notInclude(text, '+ ');
        assert.match(text, /… \d+ more, puth_inspect cursor=15\nkinds: .*button/);
    }, 20000);

    it('checks exact text', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });
        await run(sessionId, { op: 'click', selector: '#go' });

        assert.notOk((await run(sessionId, { op: 'textIs', selector: '#verify', text: 'clicked button' })).isError);
        assert.match((await run(sessionId, { op: 'textIs', selector: '#verify', text: 'clicked', timeout: 100 })).text, /^ERR ASSERTION_FAILED: .*but found \[clicked button\]/);
    }, 20000);

    it('stops at the first failure and says where', async () => {
        const { session, run, tool } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { isError, text } = await run(
            sessionId,
            { op: 'title', text: 'Clicks' },
            { op: 'title', text: 'Wrong', timeout: 100 },
            { op: 'click', selector: '#go' },
        );

        assert.isTrue(isError);
        assert.match(text, /^ERR ASSERTION_FAILED: .*Clicks/);
        assert.include(text, 'at step 1 title, 1 passed');
        assert.lengthOf((await tool('puth_export', { sessionId, format: 'steps' })).text.split('\n'), 3);
    }, 20000);

    it('reports the new page after a navigation', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { text } = await run(sessionId, { op: 'visit', url: '/first?page=1' }, { op: 'visit', url: fixtureAltUrl() });

        assert.include(text, `at ${fixtureAltUrl()} "Puth fixture | Alternate origin"`);
    }, 20000);

    it('finds things by their visible text', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(clickPage) });

        const { isError } = await run(
            sessionId,
            { op: 'press', text: 'click me' },
            { op: 'seeIn', selector: '#verify', text: 'clicked button' },
            { op: 'visit', url: fixtureAltUrl() },
            { op: 'clickLink', text: 'Primary origin' },
            { op: 'title', text: 'Puth fixture' },
        );

        assert.notOk(isError);
    }, 20000);

    it('goes back, forward and reloads', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { isError } = await run(
            sessionId,
            { op: 'visit', url: fixtureAltUrl() },
            { op: 'back' },
            { op: 'title', text: 'Puth fixture' },
            { op: 'forward' },
            { op: 'reload' },
            { op: 'see', text: 'Alternate origin' },
        );

        assert.notOk(isError);
    }, 20000);

    it('evaluates scripts and returns their value', async () => {
        const { session, run } = await start();
        const sessionId = await session();

        const { text } = await run(sessionId, { op: 'evaluate', script: `({ title: document.title, sum: 1 + 1 })` });

        assert.include(text, '= {"title":"Puth fixture","sum":2}');
    }, 20000);

    it('uploads files', async () => {
        const { session, run } = await start();
        const sessionId = await session();
        await run(sessionId, { op: 'evaluate', script: `document.body.insertAdjacentHTML('beforeend', '<input id="file" type="file">')` });

        const { isError } = await run(
            sessionId,
            { op: 'upload', selector: '#file', file: cli },
            { op: 'evaluate', script: `document.querySelector('#file').files[0].name` },
        );

        assert.notOk(isError);
    }, 20000);

    it('explains why an action failed', async () => {
        const { session, run } = await start();

        const { text } = await run(await session(), { op: 'click', selector: '#never', timeout: 100 });

        assert.match(text, /^ERR ACTION_FAILED/);
    }, 20000);

    it('handles dialogs', async () => {
        const { session, run } = await start();
        const sessionId = await session({ url: served(`<button id="confirm" onclick="confirm('Sure?')">Delete</button>`) });

        const opened = await run(sessionId, { op: 'click', selector: '#confirm' });
        assert.include(opened.text, 'a dialog is open');

        assert.match((await run(sessionId, { op: 'see', text: 'anything' })).text, /^ERR DIALOG_OPEN/);
        assert.notOk((await run(sessionId, { op: 'dialog', response: 'accept' })).isError);
        assert.notOk((await run(sessionId, { op: 'see', text: 'Delete' })).isError);
    }, 20000);
});
