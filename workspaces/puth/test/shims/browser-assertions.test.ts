import {describe, expect, it, vi} from 'vitest';
import {Browser, ExpectationFailed} from '../../src/shims/Browser';

function browserWithElements(count: number): Browser {
    return new Browser(
        {} as any,
        {$$: vi.fn().mockResolvedValue(Array.from({length: count}))} as any,
    );
}

describe('Browser port', () => {
    const browserAt = (url: string) => new Browser({} as any, {url: () => url} as any);

    it('uses the explicit port when the URL has one', () => {
        expect(browserAt('http://fixtures:8081/').port()).toBe('8081');
    });

    it('derives the default port from the scheme', () => {
        expect(browserAt('http://example.test/').port()).toBe('80');
        expect(browserAt('https://example.test/').port()).toBe('443');
    });
});

describe('Browser assertTextIs', () => {
    const browserWithText = (innerText: string) => {
        const element = {getProperty: vi.fn().mockResolvedValue({jsonValue: vi.fn().mockResolvedValue(innerText)})};
        const logger = {debug: () => {}};

        return new Browser(
            {initiator: {puth: {logger}}} as any,
            {waitForSelector: vi.fn().mockResolvedValue(element), $$: vi.fn().mockResolvedValue([element])} as any,
        );
    };

    it('passes on the exact text, ignoring surrounding and repeated whitespace', async () => {
        await expect(browserWithText('  Saved\n  changes ').assertTextIs('#status', 'Saved changes')).resolves.toMatchObject({
            meta: {assertions: 1},
        });
    });

    it('fails when the text only contains what was expected', async () => {
        await expect(browserWithText('Saved twice').assertTextIs('#status', 'Saved')).rejects.toEqual(
            expect.objectContaining<Partial<ExpectationFailed>>({
                message: 'Expected text [Saved] in element [#status], but found [Saved twice].',
            }),
        );
    });
});

describe('Browser assertCount', () => {
    it('asserts the exact number of elements matching a selector', async () => {
        const browser = browserWithElements(2);

        await expect(browser.assertCount('.item', 2)).resolves.toMatchObject({
            meta: {assertions: 1},
        });
    });

    it('supports an expected count of zero without waiting for an element', async () => {
        await expect(browserWithElements(0).assertCount('.item', 0)).resolves.toBeDefined();
    });

    it('reports the selector and actual count when the assertion fails', async () => {
        await expect(browserWithElements(1).assertCount('.item', 2)).rejects.toEqual(
            expect.objectContaining<Partial<ExpectationFailed>>({
                message: 'Expected [2] elements matching selector [.item], but found [1].',
                expected: 2,
                actual: 1,
            }),
        );
    });
});
