import { Page, Viewport } from 'puppeteer-core';
import Context from '../Context';
import { getWindowBounds, maximize, move, setWindowBounds } from '../plugins/Std/PuthBrowserExtensions';
import { PuthStandardPlugin } from '../index';

export class Browser {
    private context: Context;
    private page: Page;

    public fitOnFailure: boolean = true;

    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;
    }

//    public $(selector: string): Promise<ElementHandle<NodeFor<string>> | null> {
//        return this.page.$(selector);
//    }

    public async visit(url: string): Promise<this> {
        await this.page.goto(url);
        return this;
    }
    public async click(selector: string, options: any = {}): Promise<this> {
        await this.page.click(selector, options);
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
        await maximize(this.page.browser());
        return this;
    }

    public async bounds(): Promise<object> {
        return await getWindowBounds(this.page.browser());
    }

    public async setBounds(bounds: any): Promise<this> {
        return setWindowBounds(this.page.browser(), bounds).then(_ => this);
    }

    public async resize(width, height): Promise<this> {
        await this.page.setViewport({
            width,
            height,
        });
        return this;
    }

    public async move(x: number, y: number): Promise<this> {
        await move(this.page.browser(), x, y);
        return this;
    }

    public async scrollIntoView(selector: string): Promise<this> {
        return this.page.$(selector).then(e => {
            if (e === null) {
                throw new Error('ElementNotFound');
            }

            e.scrollIntoView();
        }).then(_ => this);
    }

    // Scroll screen to element at the given selector.
    public async scrollTo(selector: string): Promise<this> {
        return this.scrollIntoView(selector);
    }

    // TODO fix args default value not correctly generated
    public async evaluate(pageFunction: string, args: any[] = []): Promise<any> {
        return this.page.evaluate(pageFunction, ...args);
    }

    public quit(): Promise<void> {
        return this.context.destroyBrowserByBrowser(this.page.browser());
    }

    public url(): string {
        return this.page.url();
    }

    public content(): Promise<string> {
        return this.page.content();
    }

    public viewport(): Viewport|null {
        return this.page.viewport();
    }

    public getCookieByName(name: string): Promise<any> {
        return PuthStandardPlugin.getCookieByName(this.page, name) as any;
    }

    public async setCookie(cookies: any[]): Promise<this> {
        await this.page.setCookie(...cookies);
        return this;
    }

    public async deleteCookie(cookies: any[]|string): Promise<this> {
        if (!Array.isArray(cookies)) {
            cookies = [{name: cookies}];
        }

        await this.page.deleteCookie(...cookies);
        return this;
    }

    public screenshot(options = {}): Promise<Uint8Array> {
        return this.page.screenshot(options);
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

    public disableFitOnFailure(): this {
        this.fitOnFailure = false;
        return this;
    }

    public enableFitOnFailure(): this {
        this.fitOnFailure = true;
        return this;
    }
}
