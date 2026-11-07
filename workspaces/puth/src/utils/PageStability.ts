import { type CDPSession, type Protocol } from 'puppeteer-core';

// An action can start a navigation shortly after it returned, for example a submitted form.
const ACTION_SETTLE_DELAY = 50;

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
    private waiters = new Set<() => void>();

    constructor(mainFrameId: string, private readonly logger?: Logger) {
        this.mainFrameId = mainFrameId;
    }

    static async track(cdp: CDPSession, register: (event: string, handler: (event: any) => void) => void, logger?: Logger) {
        await cdp.send('Page.enable');
        const { frameTree } = await cdp.send('Page.getFrameTree');
        const stability = new PageStability(frameTree.frame.id, logger);

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
    }

    // Stops waiting once the page finished or the timeout ran out. A slow page should fail on what the call expects.
    async settled(timeout: number): Promise<void> {
        const deadline = Date.now() + timeout;
        const remainingDelay = this.actionFinishedAt + ACTION_SETTLE_DELAY - Date.now();

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
