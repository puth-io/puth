import {Page} from 'puppeteer-core';
import Context from '../Context';

export class Browser {
    private context: Context;
    private page: Page;
    
    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;
    }

    public async visit(url: string): Promise<this> {
        await this.page.goto(url);
        return this;
    }

    public async blank(): Promise<this> {
        await this.visit('about:blank');
        return this;
    }

    public async refresh(options = {timeout: 15}): Promise<this> {
        await this.page.reload(options);
        return this;
    }
}
