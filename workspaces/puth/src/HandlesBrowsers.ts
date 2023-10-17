import tmp from "tmp-promise";
import puppeteer, {Browser, EventType, Handler, Page} from 'puppeteer-core';
import chromeDefaultArgs from './chromeDefaultArgs.json';

export type PuthBrowser = {
    on(event: EventType, handler: Handler<any>): void;
    once(event: EventType, handler: Handler<any>): void;
    pages(): Promise<Page[]>;
    close(): Promise<void>;
}

export type HandlesBrowsers = {
    launch: (options: any) => Promise<PuthBrowser>;
    connect: (options: any) => Promise<PuthBrowser>;
    destroy: (browser: Browser) => Promise<void>;
};

export class DefaultBrowserHandler implements HandlesBrowsers {
    private browsers: Map<Browser, () => Promise<void>> = new Map();
    
    async launch(options: any = {}) {
        let {tmpDir, browserCleanup} = await tmp.dir({unsafeCleanup: true}).then((dir) => {
            return {
                tmpDir: dir.path,
                browserCleanup: () => dir.cleanup(),
            };
        });
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                ...chromeDefaultArgs,
                '--no-sandbox',
                '--user-data-dir=' + tmpDir,
            ],
            ...options,
        });
    
        this.browsers.set(browser, browserCleanup);
        browser.once('disconnected', () => {
            this.destroy(browser);
        });
        
        return browser;
    }
    
    connect(options: any = {}): Promise<Browser> {
        return puppeteer.connect(options);
    }
    
    async destroy(browser: Browser) {
        await browser.close();
        
        let cleanup = this.browsers.get(browser);
        this.browsers.delete(browser);
        
        if (cleanup) {
            await cleanup();
        }
    }
}
