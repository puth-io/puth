import puppeteer, {Browser, EventType, Handler, Page} from 'puppeteer-core';
import chromeDefaultArgs from './chromeDefaultArgs.json';
import tmp from "tmp";

export type HandlesBrowsers = {
    launch: (options: any) => Promise<Browser>;
    connect: (options: any) => Promise<Browser>;
    destroy: (browser: Browser) => Promise<void>;
};

export class DefaultBrowserHandler implements HandlesBrowsers {
    private browsers: Map<Browser, () => Promise<void>> = new Map();
    
    async launch(options: any = {}) {
        let tmpDir = tmp.dirSync({unsafeCleanup: true});
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                ...chromeDefaultArgs,
                '--no-sandbox',
                '--user-data-dir=' + tmpDir.name,
            ],
            ...options,
        });
    
        // TODO why the fuck is fs.rm saying "directory not empty"
        // this.browsers.set(browser, () => fs.rm(tmpDir.name, {recursive: true, force: true}));
        // this.browsers.set(browser, () => tmpDir.removeCallback());
        
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
