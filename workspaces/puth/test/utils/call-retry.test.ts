import { describe, expect, it, vi } from 'vitest';
import { Browser, ExpectationFailed } from '../../src/shims/Browser';
import { CallAttempt, browserCallKind, runBrowserCall } from '../../src/utils/CallRetry';
import { PageClosedError } from '../../src/utils/TargetErrors';

const navigated = () => new Error('Execution context was destroyed, most likely because of a navigation.');

function browserOn(site: any = {}, options = {}) {
    return new Browser({} as any, { isClosed: () => false, browser: () => ({ connected: true }), ...site }, options);
}

const run = (browser, kind, fn, attempt = new CallAttempt()) => runBrowserCall(browser, attempt, 'call', kind, fn);

describe('browserCallKind', () => {
    it.each([
        ['assertSee', [], 'assertion'],
        ['waitFor', [], 'assertion'],
        ['text', [], 'read'],
        ['value', ['#input'], 'read'],
        ['value', ['#input', 'new value'], undefined],
        ['click', [], 'action'],
        ['url', [], 'read'],
        ['setTimeout', [100], 'read'],
        ['evaluate', [], undefined],
        ['visit', [], undefined],
    ])('classifies %s %j', (name, parameters, kind) => {
        expect(browserCallKind(name, parameters)).toBe(kind);
    });
});

describe('runBrowserCall', () => {
    it.each(['assertion', 'read', 'action'])('retries a %s when the page navigates', async (kind) => {
        const fn = vi.fn().mockRejectedValueOnce(navigated()).mockResolvedValueOnce('done');

        await expect(run(browserOn(), kind, fn)).resolves.toBe('done');

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('recognizes a navigation that puppeteer wrapped', async () => {
        const wrapped = new Error('Waiting for selector `#item` failed', { cause: navigated() });
        const fn = vi.fn().mockRejectedValueOnce(wrapped).mockResolvedValueOnce('done');

        await expect(run(browserOn(), 'read', fn)).resolves.toBe('done');
    });

    it('retries a failed assertion until it passes', async () => {
        const fn = vi.fn().mockRejectedValueOnce(new ExpectationFailed('not yet')).mockResolvedValueOnce('done');

        await expect(run(browserOn(), 'assertion', fn)).resolves.toBe('done');
    });

    it('reports the last failure when an assertion never passes', async () => {
        const fn = vi.fn().mockRejectedValue(new ExpectationFailed('still not there'));

        await expect(run(browserOn({}, { timeout: 120 }), 'assertion', fn)).rejects.toThrow('still not there');

        expect(fn.mock.calls.length).toBeGreaterThan(1);
    });

    it('reports why an assertion failed instead of running out of time on its last attempt', async () => {
        const browser = browserOn({}, { timeout: 150 });
        const fn = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 60));
            throw new ExpectationFailed(browser.attempt!.retried && Date.now() >= browser.attempt!.deadline! ? 'Waited 1ms' : 'text is missing');
        });

        await expect(run(browser, 'assertion', fn)).rejects.toThrow('text is missing');
    });

    it.each(['read', 'action'])('does not retry a failed expectation of a %s', async (kind) => {
        const fn = vi.fn().mockRejectedValue(new ExpectationFailed('not found'));

        await expect(run(browserOn(), kind, fn)).rejects.toThrow('not found');

        expect(fn).toHaveBeenCalledOnce();
    });

    it('does not retry unrelated errors', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('invalid selector'));

        await expect(run(browserOn(), 'assertion', fn)).rejects.toThrow('invalid selector');

        expect(fn).toHaveBeenCalledOnce();
    });

    it('never repeats an action that reached the page', async () => {
        const attempt = new CallAttempt();
        const fn = vi.fn(async () => {
            attempt.dispatched = true;
            throw navigated();
        });

        await expect(run(browserOn(), 'action', fn, attempt)).rejects.toThrow('Execution context was destroyed');

        expect(fn).toHaveBeenCalledOnce();
    });

    it('fails as an expectation when the page keeps changing until the timeout', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());

        await expect(run(browserOn({}, { timeout: 120 }), 'read', fn)).rejects.toBeInstanceOf(ExpectationFailed);
    });

    it('reports a closed page instead of retrying', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());

        await expect(run(browserOn({ isClosed: () => true }), 'assertion', fn)).rejects.toBeInstanceOf(PageClosedError);

        expect(fn).toHaveBeenCalledOnce();
    });

    it('reports a lost browser as a closed page', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());
        const site = { browser: () => ({ connected: false }) };

        await expect(run(browserOn(site), 'assertion', fn)).rejects.toBeInstanceOf(PageClosedError);
    });

    it('checks the page of a frame', async () => {
        const fn = vi.fn().mockRejectedValue(navigated());
        const frame = { page: () => ({ isClosed: () => true, browser: () => ({ connected: true }) }) };

        await expect(run(new Browser({} as any, frame as any), 'read', fn)).rejects.toBeInstanceOf(PageClosedError);
    });

    it('shares one timeout across attempts but keeps the first attempt exact', async () => {
        const browser = browserOn({}, { timeout: 1000 }) as any;
        const timeouts: number[] = [];
        const fn = vi.fn(async () => {
            timeouts.push(browser.resolveTimeout());
            if (timeouts.length === 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
                throw navigated();
            }
        });

        await run(browser, 'assertion', fn);

        expect(timeouts[0]).toBe(1000);
        expect(timeouts[1]).toBeLessThanOrEqual(800);
        expect(timeouts[1]).toBeGreaterThan(0);
    });

    it('uses an explicit timeout of the call as its deadline', async () => {
        const browser = browserOn({}, { timeout: 60000 }) as any;
        const fn = vi.fn(async () => {
            browser.resolveTimeout(100);
            throw navigated();
        });

        await expect(run(browser, 'assertion', fn)).rejects.toBeInstanceOf(ExpectationFailed);
    });

    it('does not change timeouts outside of a call', async () => {
        const browser = browserOn({}, { timeout: 1000 }) as any;
        await run(browser, 'assertion', async () => {});

        expect(browser.resolveTimeout()).toBe(1000);
    });

    it('lets a location assert retry instead of reporting a navigation as a failed expectation', async () => {
        const waitForFunction = vi.fn().mockRejectedValueOnce(navigated()).mockResolvedValueOnce({});
        const browser = browserOn({ waitForFunction, url: () => 'http://fixture.test/' });

        await run(browser, 'assertion', () => browser.assertUrlIs('http://fixture.test/'));

        expect(waitForFunction).toHaveBeenCalledTimes(2);
    });
});
