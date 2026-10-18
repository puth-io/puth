import { afterEach, describe, expect, it, vi } from 'vitest';
import { type } from '../../src/plugins/utils/cy';

function keyboardFixture() {
    const events: { action: string; key: string; time: number }[] = [];
    const keyboard = Object.fromEntries(['down', 'up', 'press'].map(action => [action,
        async (key: string) => { events.push({ action, key, time: Date.now() }); },
    ]));
    // Puppeteer no longer exposes page.waitForTimeout().
    const element = { frame: { page: () => ({ keyboard }) } };
    return { element, events };
}

describe('special-key typing', () => {
    afterEach(() => vi.useRealTimers());

    it('delays ordinary characters in a mixed sequence and releases modifiers', async () => {
        vi.useFakeTimers();
        const { element, events } = keyboardFixture();
        const typing = type(element, '{shift}ab', { delay: 25 });
        const completed = expect(typing).resolves.toBeUndefined();
        await vi.runAllTimersAsync();
        await completed;

        const characters = events.filter(event => event.action === 'down' && ['a', 'b'].includes(event.key));
        expect(characters.map(event => event.key)).toEqual(['a', 'b']);
        expect(characters[1].time - characters[0].time).toBeGreaterThanOrEqual(25);
        expect(events.at(-1)).toMatchObject({ action: 'up', key: 'Shift' });
    });

    it('selects all with a delay and releases Control', async () => {
        vi.useFakeTimers();
        const { element, events } = keyboardFixture();
        const typing = type(element, '{selectall}', { delay: 25 });
        const completed = expect(typing).resolves.toBeUndefined();
        await vi.runAllTimersAsync();
        await completed;

        expect(events.map(({ action, key }) => [action, key])).toEqual([
            ['down', 'Control'], ['press', 'a'], ['up', 'Control'],
        ]);
        expect(events[2].time - events[1].time).toBeGreaterThanOrEqual(25);
    });
});
