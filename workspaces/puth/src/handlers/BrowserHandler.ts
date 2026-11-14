import { Puth } from '../Puth';
import Context from '../Context';
import { BaseHandler } from './BaseHandler';
import chromeDefaultArgs from './chromeDefaultArgs.json';
import {objectHash} from '../utils/external/object-hash';
import puppeteer, { Browser, BrowserContext, PuppeteerError } from 'puppeteer-core';
import tmp from 'tmp';

export type IBrowserHandler = {
    launch: (options: any, context: Context) => Promise<BrowserRefContext>;
    // connect: (options: any) => Promise<Browser>;
    destroy: (brc: BrowserRefContext) => Promise<void>;
    shutdown: () => Promise<void>;
    stats: () => { pooled: number; unused: number; contexts: number };
};

export type BrowserRef = {
    browser: Browser;
    contexts: BrowserRefContext[];
    optionsHash: string;
    cleanup?: () => Promise<void>;
    destroying?: boolean;
    unusedSince?: number;
}

export type BrowserRefContext = {
    ref: BrowserRef;
    context: BrowserContext;
    initiator: Context;
}

// TODO rework pool, either only push BrowserRefs into the pool when they are done or we need to give every ref its own
//      browserContexts array and track the root browser context somewhere else but that implies that we track refs by
//      context.
export class BrowserHandler extends BaseHandler implements IBrowserHandler {
    #refs: BrowserRef[] = [];
    #cleanupInterval: NodeJS.Timeout;

    // limits the browsers that are kept cached
    public browserLimit = 3;

    // destroy the actual browser after it's unused for defined seconds
    public browserUnusedTimeout = 120 * 1000;

    constructor(puth: Puth) {
        super(puth);
        this.#cleanupInterval = setInterval(() => this.cleanupUnused(), this.browserUnusedTimeout);
        this.#cleanupInterval.unref();
    }

    async launch(options: any = {}, context: Context): Promise<BrowserRefContext> {
        // Puppeteer adds to the options it launches with, so it gets a copy.
        options = { ...options };
        let optionsHash = objectHash(options);

        let ref = this.findBrowserRefForOptionsHash(optionsHash);
        if (ref) {
            this.logger.debug(`BrowserHandler pool reusing ref ${ref.optionsHash}`);

            return this.createContextRef(ref, context);
        }

        // Pages that are not a secure context may not request loopback. Detoured portal requests do, so their
        // listener alone counts as public. Every other local address stays protected.
        const detourUrl = await this.puth.detourUrl();
        const detourAddressSpace = detourUrl ? [`--ip-address-space-overrides=${new URL(detourUrl).host}=public`] : [];

        let userDataDir = tmp.dirSync({unsafeCleanup: true});
        options.args = [
            ...chromeDefaultArgs,
            ...detourAddressSpace,
            '--no-sandbox',
            '--user-data-dir=' + userDataDir.name,
            ...(options.args ?? []),
        ];

        // options.headless = false;

        let browser: Browser;
        try {
            browser = await puppeteer.launch(options);
        } catch (error) {
            userDataDir.removeCallback();
            throw error;
        }

        let newRef: BrowserRef = {
            browser,
            contexts: [],
            optionsHash,
            cleanup: async () => userDataDir.removeCallback(),
        };
        this.#refs.push(newRef);
        this.logger.debug(`BrowserHandler pool added ref ${newRef.optionsHash}`);
        browser.once('disconnected', () => this.disconnected(browser));

        return this.createContextRef(newRef, context);
    }

    private async createContextRef(ref: BrowserRef, context: Context): Promise<BrowserRefContext> {
        let contextRef = {ref, initiator: context} as BrowserRefContext;
        ref.contexts.push(contextRef);
        ref.unusedSince = undefined;

        try {
            contextRef.context = await ref.browser.createBrowserContext();
            await contextRef.context.newPage();
        } catch (error) {
            await this.destroy(contextRef).catch(destroyError => {
                this.logger.error({error: destroyError}, 'Could not release browser context after failed creation');
            });
            throw error;
        }

        return contextRef;
    }

    // connect(options: any = {}): Promise<Browser> {
    //     return puppeteer.connect(options);
    // }

    async destroy(brc: BrowserRefContext) {
        let {ref, context} = brc;

        let idx = ref.contexts.indexOf(brc);
        if (idx == -1) {
            return;
        }
        this.logger.debug(`BrowserHandler pool destroying browser context for ref ${ref.optionsHash}`);
        ref.contexts.splice(idx, 1);

        try {
            await context?.close();
        } catch (error: any) {
            if (! (error instanceof PuppeteerError || error.message?.includes('Connection closed'))) {
                this.logger.error({error});
                throw error;
            }
            this.logger.error({error}, 'ignoring');
        } finally {
            if (ref.contexts.length === 0) {
                ref.unusedSince = Date.now();
            }
        }
        this.logger.debug(`BrowserHandler pool destroyed browser context for ref ${ref.optionsHash}`);
        this.logger.debug(ref.contexts, 'ref.contexts');

        if (ref.contexts.length === 0) {
            await this.cleanupUnused();
        }
    }

    stats() {
        return {
            pooled: this.#refs.length,
            unused: this.allUnusedBrowsers().length,
            contexts: this.#refs.reduce((count, ref) => count + ref.contexts.length, 0),
        };
    }

    async shutdown() {
        clearInterval(this.#cleanupInterval);
        await Promise.allSettled([...this.#refs].map(ref => this.destroyRef(ref)));
    }

    private async destroyRef(ref?: BrowserRef) {
        if (ref == null || ref.destroying) {
            return;
        }
        ref.destroying = true;
        this.logger.debug(`BrowserHandler pool destroying ref ${ref.optionsHash}`);

        if (ref.contexts.length > 0) {
            this.logger.warn({optionsHash: ref.optionsHash}, `[BrowserHandler] Browser disconnected with open browser contexts. This will interrupt all contexts.`);
            let interrupted = ref.contexts;
            ref.contexts = [];
            await Promise.allSettled(interrupted.map(brc => brc.initiator.fatal('FATAL: Browser context unexpectedly closed.', brc)));
        }

        this.#refs = this.#refs.filter(other => other !== ref);

        try {
            await ref.browser.close();
        } catch (error) {
            this.logger.debug({error}, '[BrowserHandler] Could not close browser, it is probably gone already');
        } finally {
            await ref.cleanup?.();
        }
    }

    async disconnected(browser: Browser) {
        let ref = this.findBrowserRef(browser);
        this.logger.debug(ref, `[BrowserHandler] disconnected browser`);
        return this.destroyRef(ref);
    }

    findBrowserRefForOptionsHash(optionsHash: string): BrowserRef|undefined {
        return this.#refs.find(ref => ref.optionsHash === optionsHash && !ref.destroying);
    }

    findBrowserRef(browser: Browser): BrowserRef|undefined {
        return this.#refs.find(ref => ref.browser === browser);
    }

    async cleanupUnused() {
        let unused = this.allUnusedBrowsers();
        let toDestroy: BrowserRef[] = [];

        let aboveLimit = unused.length - this.browserLimit;
        if (aboveLimit > 0) {
            toDestroy.push(...unused.splice(0, Math.min(aboveLimit, unused.length)));
        }

        for (let ref of unused) {
            if (ref?.unusedSince == null || (ref.unusedSince + this.browserUnusedTimeout) >= Date.now()) {
                break;
            }
            toDestroy.push(ref);
        }
        this.logger.debug(toDestroy, '[BrowserHandler] GC checking...');

        return Promise.all(toDestroy.map(ref => this.destroyRef(ref)));
    }

    allUnusedBrowsers(): BrowserRef[] {
        return this.#refs
            .filter(ref => ref.unusedSince != undefined)
            // @ts-ignore
            .sort((a, b) => a.unusedSince - b.unusedSince);
    }
}
