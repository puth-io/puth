import Context from '../Context';
import {Frame, Page as PPTRPage} from 'puppeteer-core';
import Return from '../context/Return';

export class SimpleBrowser {
    private readonly context: Context;
    private readonly page: PPTRPage;
    
    private baseUrl: string;
    
    constructor(context: Context, site: PPTRPage|Frame, baseUrl: string) {
        this.context = context;
        this.page = site instanceof Frame ? site.page() : site;
        this.baseUrl = baseUrl;
    }
    
    public async visit(url: string|Page): Promise<this> {
        if (url instanceof Page) {
            url = url.url();
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `${this.baseUrl}/${url.replace(/^\/+/, '')}`;
        }
        
        await this.page.goto(url);
        
        // set page.on()
        
        return this;
    }
    
    public async assertSeeIn(selector: string, text: string) {
        let handle = await this.page.locator(selector).waitHandle();
        let value = await (await handle.getProperty('innerText')).jsonValue() as string;
        
        if (!value.includes(text)) {
            return Return.Error('Value does not include text.')
        }
        return this;
    }
    
    public setBaseUrl(baseUrl: string): this {
        this.baseUrl = baseUrl;
        return this;
    }
    
    public getBaseUrl(): Return {
        return Return.Value(this.baseUrl);
    }
}

export class Page {
    public url(): string {
        return 'test';
    }
}
