import {describe, expect, it, vi} from 'vitest';
import {Browser, ExpectationFailed} from '../../src/shims/Browser';
import {PageClosedError} from '../../src/utils/TargetErrors';

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

describe('Browser retryOnTargetChange', () => {
    const navigated = () => new Error('Execution context was destroyed, most likely because of a navigation.');

    function browserOn(site: any = {}, options = {}) {
        return new Browser({} as any, {isClosed: () => false, browser: () => ({connected: true}), ...site}, options);
    }

    it('runs the call again when the page navigates', async () => {
        const fn = vi.fn().mockRejectedValueOnce(navigated()).mockResolvedValueOnce('done');

        await expect(browserOn().retryOnTargetChange('assertSee', fn)).resolves.toBe('done');

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('recognizes a navigation that puppeteer wrapped', async () => {
        const wrapped = new Error('Waiting for selector `#item` failed', {cause: navigated()});
        const fn = vi.fn().mockRejectedValueOnce(wrapped).mockResolvedValueOnce('done');

        await expect(browserOn().retryOnTargetChange('waitFor', fn)).resolves.toBe('done');
    });

    it('does not retry a failed expectation', async () => {
        const fn = vi.fn().mockRejectedValue(new ExpectationFailed('not there'));

        await expect(browserOn().retryOnTargetChange('assertSee', fn)).rejects.toThrow('not there');

        expect(fn).toHaveBeenCalledOnce();
    });

    it('does not retry unrelated errors', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('invalid selector'));

        await expect(browserOn().retryOnTargetChange('assertSee', fn)).rejects.toThrow('invalid selector');

        expect(fn).toHaveBeenCalledOnce();
    });

    it('fails as an expectation when the page keeps changing until the timeout', async () => {
        const browser = browserOn({}, {timeout: 120});
        const fn = vi.fn().mockRejectedValue(navigated());

        await expect(browser.retryOnTargetChange('assertSee', fn)).rejects.toBeInstanceOf(ExpectationFailed);

        expect(fn.mock.calls.length).toBeGreaterThan(1);
    });

    it('reports a closed page instead of retrying', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());

        await expect(browserOn({isClosed: () => true}).retryOnTargetChange('waitFor', fn)).rejects.toBeInstanceOf(PageClosedError);

        expect(fn).toHaveBeenCalledOnce();
    });

    it('reports a lost browser as a closed page', async () => {
        const site = {browser: () => ({connected: false})};
        const fn = vi.fn().mockRejectedValue(navigated());

        await expect(browserOn(site).retryOnTargetChange('waitFor', fn)).rejects.toBeInstanceOf(PageClosedError);
    });

    it('checks the page of a frame', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());
        const frame = {page: () => ({isClosed: () => true, browser: () => ({connected: true})})};

        await expect(new Browser({} as any, frame as any).retryOnTargetChange('waitFor', fn)).rejects.toBeInstanceOf(PageClosedError);
    });

    it('shares one timeout across attempts but keeps the first attempt exact', async () => {
        const browser = browserOn({}, {timeout: 1000}) as any;
        const timeouts: number[] = [];
        const fn = vi.fn(async () => {
            timeouts.push(browser.resolveTimeout());
            if (timeouts.length === 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
                throw navigated();
            }
        });

        await browser.retryOnTargetChange('assertSee', fn);

        expect(timeouts[0]).toBe(1000);
        expect(timeouts[1]).toBeLessThanOrEqual(800);
        expect(timeouts[1]).toBeGreaterThan(0);
    });

    it('uses an explicit timeout of the call as its deadline', async () => {
        const browser = browserOn({}, {timeout: 60000}) as any;
        const fn = vi.fn(async () => {
            browser.resolveTimeout(100);
            throw navigated();
        });

        await expect(browser.retryOnTargetChange('waitFor', fn)).rejects.toBeInstanceOf(ExpectationFailed);
    });

    it('does not change timeouts outside of a retried call', async () => {
        const browser = browserOn({}, {timeout: 1000}) as any;
        await browser.retryOnTargetChange('assertSee', async () => {});

        expect(browser.resolveTimeout()).toBe(1000);
    });

    it('lets a location assert retry instead of reporting a navigation as a failed expectation', async () => {
        const waitForFunction = vi.fn().mockRejectedValueOnce(navigated()).mockResolvedValueOnce({});
        const browser = browserOn({waitForFunction, url: () => 'http://fixture.test/'});

        await browser.retryOnTargetChange('assertUrlIs', () => browser.assertUrlIs('http://fixture.test/'));

        expect(waitForFunction).toHaveBeenCalledTimes(2);
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
