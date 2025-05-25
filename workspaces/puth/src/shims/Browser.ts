import { Page, Viewport } from 'puppeteer-core';
import Context from '../Context';
import { getWindowBounds, maximize, move, setWindowBounds } from '../plugins/Std/PuthBrowserExtensions';
import { PuthStandardPlugin } from '../index';

export class Browser {
    private context: Context;
    private page: Page;

    private self: () => this;

    public fitOnFailure: boolean = true;


    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;

        this.self = () => this;
    }

//    public $(selector: string): Promise<ElementHandle<NodeFor<string>> | null> {
//        return this.page.$(selector);
//    }

    public visit(url: string): Promise<this> {
        return this.page.goto(url).then(this.self);
    }
    public click(selector: string, options: any = {}): Promise<this> {
        return this.page.click(selector, options).then(this.self);
    }

    public blank(): Promise<this> {
        return this.visit('about:blank').then(this.self);
    }

    public refresh(options = {}): Promise<this> {
        return this.page.reload(options).then(this.self);
    }

    // Navigate to the previous page.
    public back(options = {}): Promise<this> {
        return this.page.goBack(options).then(this.self);
    }

    // Navigate to the next page.
    public forward(options = {}): Promise<this> {
        return this.page.goForward(options).then(this.self);
    }

    public maximize(): Promise<this> {
        return maximize(this.page.browser()).then(this.self);
    }

    public bounds(): Promise<object> {
        return getWindowBounds(this.page.browser());
    }

    public setBounds(bounds: any): Promise<this> {
        return setWindowBounds(this.page.browser(), bounds).then(this.self);
    }

    public resize(width, height): Promise<this> {
        return this.page.setViewport({
            width,
            height,
        }).then(this.self);
    }

    public move(x: number, y: number): Promise<this> {
        return move(this.page.browser(), x, y).then(this.self);
    }

    public scrollIntoView(selector: string): Promise<this> {
        return this.page.$(selector).then(e => {
            if (e === null) {
                throw new Error('ElementNotFound');
            }

            e.scrollIntoView();
        }).then(this.self);
    }

    // Scroll screen to element at the given selector.
    public scrollTo(selector: string): Promise<this> {
        return this.scrollIntoView(selector);
    }

    // TODO fix args default value not correctly generated
    public evaluate(pageFunction: string, args: any[] = []): Promise<any> {
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

    public setCookie(cookies: any[]): Promise<this> {
        return this.page.setCookie(...cookies).then(this.self);
    }

    public deleteCookie(cookies: any[]|string): Promise<this> {
        if (!Array.isArray(cookies)) {
            cookies = [{name: cookies}];
        }

        return this.page.deleteCookie(...cookies).then(this.self);
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

    // Directly get or set the value attribute of an input field
    public async value(selector: string, value: any = null): Promise<this> {
        let element = await this.page.$(selector);
        if (element === null) {
            throw new Error('Element not found.');
        }

        return PuthStandardPlugin.value(element, value).then(this.self);
    }

}
