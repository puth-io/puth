import {describe, expect, it, vi} from 'vitest';
import {Browser, ExpectationFailed} from '../../src/shims/Browser';

function browserWithElements(count: number): Browser {
    return new Browser(
        {} as any,
        {$$: vi.fn().mockResolvedValue(Array.from({length: count}))} as any,
    );
}

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
