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

        expect(await isSettled(stability.settled(5000, true, 20), 20)).toBe(true);
    });

    it('gives an action time to start a navigation', async () => {
        stability.actionFinished();
        const settled = stability.settled(5000, true, 20);

        expect(await isSettled(settled, 10)).toBe(false);
        stability.navigationRequested({ ...main, disposition: 'currentTab' });
        stability.loadingStarted(main);
        expect(await isSettled(settled, 100)).toBe(false);
        stability.loadingStopped(main);
        expect(await isSettled(settled)).toBe(true);
    });

    it('receives a navigation that the page announced just after an action', async () => {
        let answer!: () => void;
        stability = new PageStability(MAIN, undefined, () => new Promise<void>(resolve => { answer = resolve; }));
        stability.actionFinished();
        const settled = stability.settled(5000, true);

        expect(await isSettled(settled, 100)).toBe(false);
        stability.navigationRequested({ ...main, disposition: 'currentTab' });
        answer();
        expect(await isSettled(settled, 100)).toBe(false);
        stability.loadingStarted(main);
        stability.loadingStopped(main);
        expect(await isSettled(settled)).toBe(true);
    });

    it('asks the page once per action', async () => {
        const roundTrip = vi.fn(async () => {});
        stability = new PageStability(MAIN, undefined, roundTrip);

        await stability.settled(5000, true);
        stability.actionFinished();
        await stability.settled(5000);
        await stability.settled(5000, true);
        await stability.settled(5000, true);

        expect(roundTrip).toHaveBeenCalledTimes(1);
    });

    it('continues when the page does not answer after an action', async () => {
        stability = new PageStability(MAIN, undefined, () => new Promise(() => {}));
        stability.actionFinished();

        expect(await isSettled(stability.settled(1000, true), 1000)).toBe(true);
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
