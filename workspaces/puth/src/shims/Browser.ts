import {Page} from 'puppeteer-core';
import Context from '../Context';
import {getWindowBounds} from '../plugins/Std/PuthBrowserExtensions';

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

    public async refresh(options = {}): Promise<this> {
        await this.page.reload(options);
        return this;
    }

    // Navigate to the previous page.
    public async back(options = {}): Promise<this> {
        await this.page.goBack(options);
        return this;
    }

    // Navigate to the next page.
    public async forward(options = {}): Promise<this> {
        await this.page.goForward(options);
        return this;
    }

    public async maximize(): Promise<this> {
        await this.maximize();
        return this;
    }

    public async bounds(): Promise<object> {
        return await getWindowBounds(this.page.browser());
    }

    public async resize(width, height): Promise<this> {
        await this.page.setViewport({
            width,
            height,
        });
        return this;
    }

    // Make the browser window as large as the content
    public async fitContent(): Promise<this> {
        let html = await this.page.$('html');
        if (! html) {
            throw new Error('Element [html] not found on page.');
        }
        let [bounds, scrollWidth, scrollHeight] = await Promise.all([
            html.boundingBox(),
            html.getProperty('scrollWidth').then(h => h.jsonValue()),
            html.getProperty('scrollHeight').then(h => h.jsonValue()),
        ]);
        if (! bounds) {
            throw new Error('Element [html] is not part of the layout.');
        }

        return this.resize(
            bounds.width > scrollWidth ? bounds?.width : scrollWidth,
            bounds.height > scrollHeight ? bounds?.height : scrollHeight,
        );
    }
}
