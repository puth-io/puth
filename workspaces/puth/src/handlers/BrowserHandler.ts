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

    // limits the browsers that are kept cached
    public browserLimit = 3;

    // destroy the actual browser after it's unused for defined seconds
    public browserUnusedTimeout = 120 * 1000;

    constructor(puth: Puth) {
        super(puth);
        setInterval(() => this.cleanupUnused(), this.browserUnusedTimeout);
    }

    async launch(options: any = {}, context: Context): Promise<BrowserRefContext> {
        let optionsHash = objectHash(options);

        let ref = this.findBrowserRefForOptionsHash(optionsHash);
        if (ref) {
            this.logger.debug(`BrowserHandler pool reusing ref ${ref.optionsHash}`);
            ref.unusedSince = undefined;

            let contextRef = {ref, initiator: context} as BrowserRefContext;
            ref.contexts.push(contextRef);

            return ref.browser.createBrowserContext()
                .then(async browserContext => {
                    contextRef.context = browserContext;
                    await browserContext.newPage();

                    return contextRef;
                });
        }

        options.args = [
            ...chromeDefaultArgs,
            '--no-sandbox',
            '--user-data-dir=' + tmp.dirSync({unsafeCleanup: true}).name,
            ...(options.args ?? []),
        ];

        // options.headless = false;

        return puppeteer.launch(options)
            .then(async browser => {
                let ref: BrowserRef = {
                    browser,
                    contexts: [],
                    optionsHash,
                };
                this.#refs.push(ref);
                this.logger.debug(`BrowserHandler pool added ref ${ref.optionsHash}`);
                browser.once('disconnected', () => this.disconnected(browser));

                let contextRef = {ref, initiator: context} as BrowserRefContext;
                ref.contexts.push(contextRef);

                return browser.createBrowserContext()
                    .then(async browserContext => {
                        contextRef.context = browserContext;
                        await browserContext.newPage();

                        return contextRef;
                    });
            });
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

        await context.close().catch(error => {
            if (error instanceof PuppeteerError) {
                this.logger.error({error}, 'ignoring');
                return;
            }
            this.logger.error({error});
            throw error;
        });
        this.logger.debug(`BrowserHandler pool destroyed browser context for ref ${ref.optionsHash}`);
        this.logger.debug(ref.contexts, 'ref.contexts');

        if (ref.contexts.length === 0) {
            ref.unusedSince = Date.now();
            await this.cleanupUnused();
        }
    }

    private async destroyRef(ref?: BrowserRef) {
        if (ref == null || ref.destroying) {
            return;
        }
        ref.destroying = true;
        this.logger.debug(`BrowserHandler pool destroying ref ${ref.optionsHash}`);

        if (ref.contexts.length > 0) {
            this.logger.debug(ref, `BrowserHandler could not close ref - still has open contexts.`);
            throw new Error('Could not close ref - still has open contexts.');
        }

        let idx = this.#refs.indexOf(ref);
        this.#refs.splice(idx, 1);

        return ref.browser.close()
            // return cause possibly async
            .then(() => ref?.cleanup?.());
    }

    async disconnected(browser: Browser) {
        let ref = this.findBrowserRef(browser);
        this.logger.debug(ref, `BrowserHandler disconnected browser`);
        // TODO forward unexpected browser disconnects to client
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
        this.logger.debug(toDestroy, 'BrowserHandler GC checking...');

        return Promise.all(toDestroy.map(ref => this.destroyRef(ref)));
    }

    allUnusedBrowsers(): BrowserRef[] {
        return this.#refs
            .filter(ref => ref.unusedSince != undefined)
            // @ts-ignore
            .sort((a, b) => a.unusedSince - b.unusedSince);
    }
}
