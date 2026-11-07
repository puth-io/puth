import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageStability } from '../../src/utils/PageStability';

const MAIN = 'main';
const main = { frameId: MAIN } as any;

async function isSettled(promise: Promise<void>, advance = 0) {
    let settled = false;
    void promise.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(advance);

    return settled;
}

describe('PageStability', () => {
    let stability: PageStability;

    beforeEach(() => {
        vi.useFakeTimers();
        stability = new PageStability(MAIN);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not wait on an idle page', async () => {
        expect(await isSettled(stability.settled(5000))).toBe(true);
    });

    it('waits until a loading page finished', async () => {
        stability.loadingStarted(main);
        const settled = stability.settled(5000);

        expect(await isSettled(settled, 1000)).toBe(false);
        stability.loadingStopped(main);
        expect(await isSettled(settled)).toBe(true);
    });

    it('waits for a requested navigation to start', async () => {
        stability.navigationRequested({ ...main, disposition: 'currentTab' });
        const settled = stability.settled(5000);

        expect(await isSettled(settled, 100)).toBe(false);
        stability.loadingStarted(main);
        expect(await isSettled(settled, 2000)).toBe(false);
        stability.loadingStopped(main);
        expect(await isSettled(settled)).toBe(true);
    });

    it('gives up on a requested navigation that never starts, like a download', async () => {
        stability.navigationRequested({ ...main, disposition: 'currentTab' });

        expect(await isSettled(stability.settled(5000), 1000)).toBe(true);
    });

    it('ignores navigations in new tabs and other frames', async () => {
        stability.navigationRequested({ ...main, disposition: 'newTab' });
        stability.loadingStarted({ frameId: 'iframe' } as any);

        expect(await isSettled(stability.settled(5000))).toBe(true);
    });

    it('does not wait after an action unless asked to', async () => {
        stability.actionFinished();

        expect(await isSettled(stability.settled(5000))).toBe(true);
    });

    it('waits no longer than the configured time after an action', async () => {
        stability.actionFinished();

        expect(await isSettled(stability.settled(5000, 20), 20)).toBe(true);
    });

    it('gives an action time to start a navigation', async () => {
        stability.actionFinished();
        const settled = stability.settled(5000, 20);

        expect(await isSettled(settled, 10)).toBe(false);
        stability.navigationRequested({ ...main, disposition: 'currentTab' });
        stability.loadingStarted(main);
        expect(await isSettled(settled, 100)).toBe(false);
        stability.loadingStopped(main);
        expect(await isSettled(settled)).toBe(true);
    });

    it('continues after the timeout and does not wait for that load again', async () => {
        stability.loadingStarted(main);

        expect(await isSettled(stability.settled(1000), 1000)).toBe(true);
        expect(await isSettled(stability.settled(1000))).toBe(true);
    });

    it('releases waiting calls when the page goes away', async () => {
        stability.loadingStarted(main);
        const settled = stability.settled(5000);

        stability.dispose();

        expect(await isSettled(settled)).toBe(true);
    });

    it('follows the main frame across navigations', async () => {
        stability.frameNavigated({ frame: { id: 'swapped' } } as any);
        stability.loadingStarted({ frameId: 'swapped' } as any);

        expect(await isSettled(stability.settled(5000), 100)).toBe(false);
    });
});
