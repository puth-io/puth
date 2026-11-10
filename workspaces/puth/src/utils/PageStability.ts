import { type CDPSession, type Protocol } from 'puppeteer-core';

// A requested navigation might never load, for example when it turns into a download.
const REQUESTED_NAVIGATION_DELAY = 1000;

type Logger = { warn: (...args: any[]) => void };

/**
 * Tracks whether the main frame of a page is transitioning to another document, so calls can pause until it loaded.
 */
export class PageStability {
    private mainFrameId: string;
    private loading = false;
    private requestedAt?: number;
    private actionFinishedAt = 0;
    private actionUnflushed = false;
    private waiters = new Set<() => void>();

    constructor(
        mainFrameId: string,
        private readonly logger?: Logger,
        private readonly roundTrip: () => Promise<unknown> = async () => {},
    ) {
        this.mainFrameId = mainFrameId;
    }

    static async track(cdp: CDPSession, register: (event: string, handler: (event: any) => void) => void, logger?: Logger) {
        await cdp.send('Page.enable');
        const { frameTree } = await cdp.send('Page.getFrameTree');
        // The page answers after it sent the events it emitted before, like the navigation a click requested.
        const stability = new PageStability(
            frameTree.frame.id,
            logger,
            () => cdp.send('Runtime.evaluate', { expression: '0', returnByValue: true }),
        );

        register('Page.frameRequestedNavigation', event => stability.navigationRequested(event));
        register('Page.frameStartedLoading', event => stability.loadingStarted(event));
        register('Page.frameStoppedLoading', event => stability.loadingStopped(event));
        register('Page.frameNavigated', event => stability.frameNavigated(event));

        return stability;
    }

    navigationRequested({ frameId, disposition }: Protocol.Page.FrameRequestedNavigationEvent) {
        if (frameId === this.mainFrameId && disposition === 'currentTab') {
            this.requestedAt = Date.now();
        }
    }

    loadingStarted({ frameId }: Protocol.Page.FrameStartedLoadingEvent) {
        if (frameId === this.mainFrameId) {
            this.requestedAt = undefined;
            this.loading = true;
        }
    }

    loadingStopped({ frameId }: Protocol.Page.FrameStoppedLoadingEvent) {
        if (frameId === this.mainFrameId) {
            this.loading = false;
            this.notify();
        }
    }

    frameNavigated({ frame }: Protocol.Page.FrameNavigatedEvent) {
        if (frame.parentId === undefined) {
            this.mainFrameId = frame.id;
        }
    }

    actionFinished() {
        this.actionFinishedAt = Date.now();
        this.actionUnflushed = true;
    }

    // Stops waiting once the page finished or the timeout ran out. A slow page should fail on what the call expects.
    // A navigation that an action requested, like a submitted form, can be announced just after the action returned.
    // One round trip to the page receives it. Navigations started later, from a timer or after a request, need a wait or
    // an assertion, or actionSettle milliseconds.
    async settled(timeout: number, afterAction = false, actionSettle = 0): Promise<void> {
        const deadline = Date.now() + timeout;

        if (afterAction && this.actionUnflushed) {
            this.actionUnflushed = false;
            await this.flush(timeout);
        }

        const remainingDelay = afterAction ? this.actionFinishedAt + actionSettle - Date.now() : 0;

        if (remainingDelay > 0) {
            await this.wait(remainingDelay);
        }

        while (this.transitioning) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                this.logger?.warn('Page did not finish loading in time, continuing.');
                this.loading = false;
                this.requestedAt = undefined;
                return;
            }

            await this.wait(this.loading ? remaining : Math.min(remaining, this.requestedRemaining));
        }
    }

    private get requestedRemaining() {
        return (this.requestedAt ?? 0) + REQUESTED_NAVIGATION_DELAY - Date.now();
    }

    private get transitioning() {
        return this.loading || (this.requestedAt !== undefined && this.requestedRemaining > 0);
    }

    // A page that does not answer, like one that is busy, should fail on the call itself.
    private async flush(timeout: number) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            this.roundTrip().catch(() => {}),
            new Promise<void>(resolve => { timer = setTimeout(resolve, timeout); }),
        ]);
        clearTimeout(timer);
    }

    private wait(delay: number) {
        return new Promise<void>((resolve) => {
            const finish = () => {
                clearTimeout(timeout);
                this.waiters.delete(finish);
                resolve();
            };
            const timeout = setTimeout(finish, delay);

            this.waiters.add(finish);
        });
    }

    private notify() {
        [...this.waiters].forEach(finish => finish());
    }

    // Lets pending calls continue, they fail on their own if the page went away.
    dispose() {
        this.loading = false;
        this.requestedAt = undefined;
        this.notify();
    }
}
