import puppeteer, { Browser, BrowserContext, EventType, Handler, Page, PuppeteerError } from 'puppeteer-core';
import chromeDefaultArgs from './chromeDefaultArgs.json';
import tmp from 'tmp';
import {objectHash} from './utils/external/object-hash';

export type HandlesBrowsers = {
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

export class DefaultBrowserHandler implements HandlesBrowsers {
    private refs: BrowserRef[] = [];

    // limits the browsers that are kept cached
    public browserLimit = 3;

    // destroy the actual browser after it's unused for defined seconds
    public browserUnusedTimeout = 30 * 1000;

    async launch(options: any = {}): Promise<{ref: BrowserRef, context: BrowserContext}> {
        let optionsHash = objectHash(options);

        let ref = this.findBrowserRefForOptionsHash(optionsHash);
        if (ref) {
            console.debug('reusing browser', optionsHash);
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

        console.debug('launching browser', optionsHash);
        return puppeteer.launch(options)
            .then(async browser => {
                let ref: BrowserRef = {
                    browser,
                    browserContexts: [],
                    optionsHash,
                };
                this.refs.push(ref);
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
                console.error({error});
                throw error;
            });
        }))
            .finally(() => {
                if (ref.browserContexts.length === 0) {
                    ref.unusedSince = Date.now();
                }

                return this.cleanupUnused();
            });
    }

    async destroyBrowser(browser: Browser) {
        let ref = this.findBrowserRef(browser);
        if (ref == null) {
            return;
        }
        ref.destroying = true;

        let idx = this.refs.findIndex(ref => ref.browser = browser);
        this.refs.splice(idx, 1);

        return ref.browser.close()
            // return cause possibly async
            .then(() => ref?.cleanup?.());
    }

    async disconnected(browser: Browser) {
        // TODO handle unexpected browser disconnects

        // get the cleanup object before we destroy the actual browser instance
        // let ref = this.browsers.get(browser);
        // if (ref == null) {
        //     return;
        // }
    }

    findBrowserRefForOptionsHash(optionsHash: string): BrowserRef|void {
        return this.refs.find(ref => ref.optionsHash === optionsHash);
    }

    findBrowserRef(browser: Browser): BrowserRef|void {
        return this.refs.find(ref => ref.browser === browser);
    }

    // (ref.unusedSince + this.browserUnusedTimeout) < Date.now()

    async cleanupUnused() {
        let unused = this.allUnusedBrowsers();
        let promises: Promise<any>[] = [];

        let aboveLimit = unused.length - this.browserLimit;
        if (aboveLimit > 0) {
            console.log('removing...', aboveLimit);
            for (let i = 0; i < aboveLimit; i++) {
                promises.push(this.destroyBrowser(unused[i].browser));
            }
        }

        return Promise.all(promises);
    }

    allUnusedBrowsers(): BrowserRef[] {
        return this.refs
            .filter(ref => ref.unusedSince != null)
            // @ts-ignore
            .sort((a, b) => a.unusedSince - b.unusedSince);
    }
}
