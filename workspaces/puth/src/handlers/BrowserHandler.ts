import Puth from '../Puth';
import { BaseHandler } from './BaseHandler';
import chromeDefaultArgs from '../chromeDefaultArgs.json';
import {objectHash} from '../utils/external/object-hash';
import puppeteer, { Browser, BrowserContext, PuppeteerError } from 'puppeteer-core';
import tmp from 'tmp';

export type IBrowserHandler = {
    launch: (options: any) => Promise<{ref: BrowserRef, context: BrowserContext}>;
    // connect: (options: any) => Promise<Browser>;
    destroy: (browserRef: BrowserRef, browserContext?: BrowserContext) => Promise<void[]>;
};

export type BrowserRef = {
    browser: Browser;
    optionsHash: string;
    cleanup?: () => Promise<void>;
    destroying?: boolean;
    browserContexts: BrowserContext[];
    unusedSince?: number;
}

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

    async launch(options: any = {}): Promise<{ref: BrowserRef, context: BrowserContext}> {
        let optionsHash = objectHash(options);

        let ref = this.findBrowserRefForOptionsHash(optionsHash);
        if (ref) {
            this.logger.debug(`BrowserHandler pool reusing ref ${ref.optionsHash}`);
            ref.destroying = false;
            ref.unusedSince = undefined;

            return ref.browser.createBrowserContext()
                .then(async context => {
                    ref.browserContexts.push(context);
                    await context.newPage();

                    return {ref, context};
                });
        }

        let tmpDir = tmp.dirSync({unsafeCleanup: true});

        options.args = [
            ...chromeDefaultArgs,
            '--no-sandbox',
            '--user-data-dir=' + tmpDir.name,
            ...(options.args ?? []),
        ];

        return puppeteer.launch(options)
            .then(async browser => {
                let ref: BrowserRef = {
                    browser,
                    browserContexts: [],
                    optionsHash,
                };
                this.#refs.push(ref);
                this.logger.debug(`BrowserHandler pool added ref ${ref.optionsHash}`);
                browser.once('disconnected', () => this.disconnected(browser));

                return browser.createBrowserContext()
                    .then(async context => {
                        ref.browserContexts.push(context);
                        await context.newPage();

                        return {ref, context};
                    });
            });
    }

    // connect(options: any = {}): Promise<Browser> {
    //     return puppeteer.connect(options);
    // }

    async destroy(ref: BrowserRef, browserContext?: BrowserContext) {
        let contexts = browserContext ? [browserContext] : ref.browserContexts;

        return Promise.all(contexts.map(browserContext => {
            let idx = ref.browserContexts.indexOf(browserContext);
            ref.browserContexts.splice(idx, 1);

            return browserContext.close().catch(error => {
                if (error instanceof PuppeteerError) {
                    return;
                }
                this.logger.error({error});
                throw error;
            });
        }))
            .finally(() => {
                if (ref.browserContexts.length === 0) {
                    ref.unusedSince = Date.now();
                    return this.cleanupUnused();
                }
            });
    }

    private async destroyRef(ref?: BrowserRef) {
        if (ref == null || ref.destroying) {
            return;
        }
        ref.destroying = true;
        this.logger.debug(`BrowserHandler pool destroying ref ${ref.optionsHash}`);

        let idx = this.#refs.findIndex(ref => ref === ref);
        this.#refs.splice(idx, 1);

        return ref.browser.close()
            // return cause possibly async
            .then(() => ref?.cleanup?.());
    }

    async disconnected(browser: Browser) {
        // TODO forward unexpected browser disconnects to client
        return this.destroyRef(this.findBrowserRef(browser));
    }

    findBrowserRefForOptionsHash(optionsHash: string): BrowserRef|undefined {
        return this.#refs.find(ref => ref.optionsHash === optionsHash);
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
        this.logger.debug('BrowserHandler GC checking...');

        return Promise.all(toDestroy.map(ref => this.destroyRef(ref)));
    }

    allUnusedBrowsers(): BrowserRef[] {
        return this.#refs
            .filter(ref => ref.unusedSince != null)
            // @ts-ignore
            .sort((a, b) => a.unusedSince - b.unusedSince);
    }
}
