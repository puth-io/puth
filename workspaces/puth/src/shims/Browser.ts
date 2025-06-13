import { ElementHandle, Page, Viewport, WaitForOptions } from 'puppeteer-core';
import Context from '../Context';
import { getWindowBounds, maximize, move, setWindowBounds } from '../plugins/Std/PuthBrowserExtensions';
import { PuthStandardPlugin } from '../index';
import { type } from '../plugins/utils/cy';
import { Return } from '@puth/puth/src/context/Return';

// TODO
// @gen-class ElementHandle
// interface ElementHandle {
//     children: () => ElementHandle[];
// }

export type integer = number;

export class Browser {
    private readonly context: Context;
    private readonly page: Page;

    private readonly self: () => this;
    private readonly returnOrSelf: (value: any) => this|Return;

    public fitOnFailure: boolean = true;

    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;

        this.self = (): this => this;
        this.returnOrSelf = (value: any): this|Return => (value instanceof Return) ? value : this;
    }

    public visit(url: string): Promise<this> {
        return this.page.goto(url).then(this.self);
    }

    public click(selector: string, options: any = {}): Promise<this> {
        return this.firstOrFail(selector).then(element => element.click(options)).then(this.self);
    }

    public setContent(html: string, options: WaitForOptions = {}): Promise<this> {
        return this.page.setContent(html, options).then(this.self);
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
        return this.firstOrFail(selector).then(element => element.scrollIntoView()).then(this.self);
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

    public async title(): Promise<string> {
        return this.page.title();
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
        if (! Array.isArray(cookies)) {
            cookies = [{ name: cookies }];
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

    public async value(selector: string, value: any = null): Promise<this> {
        return this.firstOrFail(selector).then(element => PuthStandardPlugin.value(element, value)).then(this.self);
    }

    public text(selector: string): Promise<string> {
        return this.attribute(selector, 'innertext');
    }

    public attribute(selector: string, attribute: string): Promise<string> {
        return this.firstOrFail(selector).then(element => PuthStandardPlugin.its(element, attribute));
    }

    public type(selector: string[]|string, value: string, options = {}): Promise<this> {
        return this.firstOrFail(selector).then(e => PuthStandardPlugin.clear(e).then(() => type(e, value, options))).then(this.self);
    }

    public typeSlowly(selector: string, value: string, pause: integer = 100): Promise<this> {
        return this.type(selector, value, { delay: pause });
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     * TODO implement timeout
     */
    public findAll(selector: string[]|string, options: {timeout: integer} = {timeout: 15}): Promise<ElementHandle[]> {
        if (Array.isArray(selector)) {
            return Promise.all(selector.flatMap(s => this.page.$$(s))).then(found => found.flat());
        }

        return this.page.$$(selector);
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     */
    public findOrFail(selector: string[]|string, options: {timeout: integer} = {timeout: 15}): Promise<ElementHandle[]> {
        return this.findAll(selector, options)
            .then(elements => {
                if (elements.length === 0) {
                    throw new Error('No element with the given selector found.');
                }

                return elements;
            });
    }

    /**
     * @gen-returns RemoteObject
     * TODO gen-returns should be ElementHandle
     */
    public firstOrFail(selector: string[]|string, options: {timeout: integer} = {timeout: 15}): Promise<ElementHandle>
    {
        return this.findOrFail(selector, options).then(found => found[0]);
    }

    //// public keys(selector: string, keys: [string]|string) {
    ////
    //// }

    //// ASSERTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Assert that the page title is the given value.
    public assertTitle(title: string): Promise<Return|this> {
        return this.expects(
            title,
            this.page.title(),
            ({ actual }) => `Expected title [${title}] does not equal actual title [${actual}].`,
        ).then(this.returnOrSelf);
    }

    // Assert that the page title contains the given value.
    public assertTitleContains(title: string): Promise<Return | this> {
        return this.expects(
            title,
            this.page.title(),
            ({ expected, actual }) => `Did not see expected value [${expected}] within title [${actual}].`,
            (expected, actual) => actual.includes(expected),
        ).then(this.returnOrSelf);
    }

    public assertHasCookie(name: string): Promise<Return | this> {
        return this.expects(
            name,
            this.getCookieByName(name),
            ({ expected }) => `Did not find expected cookie [${expected}].`,
            (_e, a) => a?.value != null,
        ).then(this.returnOrSelf);
    }

    public assertCookieMissing(name: string): Promise<Return | this> {
        return this.expects(
            name,
            this.getCookieByName(name),
            ({ expected }) => `Found unexpected cookie [${expected}].`,
            (_e, a) => a?.value == null,
        ).then(this.returnOrSelf);
    }

    public async assertCookieValue(
        name: string,
        value: string,
    ): Promise<Return | this> {
        console.error(value);
        console.error((await this.getCookieByName(name))?.value ?? '');
        return this.expects(
            value,
            (await this.getCookieByName(name))?.value?.value ?? '',
            ({ expected, actual }) => `Cookie [${name}] had value [${actual?.value ?? ''}], but expected [${expected}].`,
        ).then(this.returnOrSelf);
    }

    public assertSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertSeeIn('body', text, ignoreCase);
    }

    public assertDontSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertDontSeeIn('body', text, ignoreCase);
    }

    public assertSeeIn(
        selector: string,
        text: string,
        ignoreCase = false,
    ): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then(element => PuthStandardPlugin.its(element, 'innerText'))
            .then(actual => this.expects(
                text,
                actual,
                ({ expected, actual }) => `Did not see expected text [${expected}] within element [${selector}].`,
                (e: string, a: string) => ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e),
            ))
            .then(this.returnOrSelf);
    }

    public assertDontSeeIn(
        selector: string,
        text: string,
        ignoreCase = false,
    ): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then(element => PuthStandardPlugin.its(element, 'innerText'))
            .then(actual => this.expects(
                text,
                actual,
                ({ expected }) => `Saw unexpected text [${expected}] within element [${selector}].`,
                (e, a) => !(ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e)),
            ))
            .then(this.returnOrSelf);
    }

    public assertSeeAnythingIn(selector: string): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then(element => PuthStandardPlugin.its(element, 'innerText'))
            .then(actual => this.expects(
                '',
                actual,
                () => `Saw unexpected text [''] within element [${selector}].`,
                (_e, a) => a !== '',
            ))
            .then(this.returnOrSelf);
    }

    public assertSeeNothingIn(selector: string): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then(element => PuthStandardPlugin.its(element, 'innerText'))
            .then(actual => this.expects(
                '',
                actual,
                () => `Did not see expected text [''] within element [${selector}].`,
            ))
            .then(this.returnOrSelf);
    }

    public assertScript(expression: string, expected: any = true): Promise<Return | this> {
        const actual = () => this.page.evaluate(expression);
        return this.expects(
            expected,
            actual,
            () => `JavaScript expression [${expression}] mismatched.`,
        ).then(this.returnOrSelf);
    }

    public assertSourceHas(code: string): Promise<Return | this> {
        this.madeSourceAssertion = true;
        const actual = () => this.page.content();
        return this.expects(
            code,
            actual,
            ({ expected }) => `Did not find expected source code [${expected}]`,
            (e, a) => a.includes(e),
        ).then(this.returnOrSelf);
    }

    public assertSourceMissing(code: string): Promise<Return | this> {
        this.madeSourceAssertion = true;
        const actual = () => this.page.content();
        return this.expects(
            code,
            actual,
            ({ expected }) => `Found unexpected source code [${expected}]`,
            (e, a) => !a.includes(e),
        ).then(this.returnOrSelf);
    }

    public assertSeeLink(link: string): Promise<Return | this> {
        return this.expects(
            true,
            () => this.seeLink(link),
            () => `Did not see expected link [${link}].`,
        ).then(this.returnOrSelf);
    }

    public assertDontSeeLink(link: string): Promise<Return | this> {
        return this.expects(
            false,
            () => this.seeLink(link),
            () => `Saw unexpected link [${link}].`,
        ).then(this.returnOrSelf);
    }

    public seeLink(link: string): boolean {
        return this.page.visible(`a[href='${link}']`);
    }

    public assertInputValue(field: any, value: string): Promise<Return | this> {
        const actual = () => this.inputValue(field);
        return this.expects(
            value,
            actual,
            ({ expected, actual }) =>
                `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
        ).then(this.returnOrSelf);
    }

    public assertInputValueIsNot(field: any, value: string): Promise<Return | this> {
        const actual = () => this.inputValue(field);
        return this.expects(
            value,
            actual,
            () => `Value [${value}] for the [${field}] input should not equal the actual value.`,
            (e, a) => e !== a,
        ).then(this.returnOrSelf);
    }

    public inputValue(field: any): string {
        return this.resolver.resolveForTyping(field).value();
    }

    public async assertInputPresent(
        field: string,
        timeout = 5,
    ): Promise<Return | this> {
        await this.assertPresent(
            `input[name='${field}'], textarea[name='${field}'], select[name='${field}']`,
            timeout,
        );
        return this;
    }

    public async assertInputMissing(
        field: string,
        timeout = 5,
    ): Promise<Return | this> {
        await this.assertMissing(
            `input[name='${field}'], textarea[name='${field}'], select[name='${field}']`,
            timeout,
        );
        return this;
    }

    public assertChecked(field: string, value: string | null = null): Promise<Return | this> {
        const element = this.resolver.resolveForChecking(field, value);
        return this.expects(
            true,
            () => element.checked,
            () => `Expected checkbox [${element}] to be checked, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertNotChecked(
        field: string,
        value: string | null = null,
    ): Promise<Return | this> {
        const element = this.resolver.resolveForChecking(field, value);
        return this.expects(
            false,
            () => element.checked,
            () => `Checkbox [${element}] was unexpectedly checked.`,
        ).then(this.returnOrSelf);
    }

    public async assertIndeterminate(
        field: string,
        value: string | null = null,
    ): Promise<Return | this> {
        await this.assertNotChecked(field, value);
        return this.expects(
            true,
            () => this.resolver.findOrFail(field).indeterminate,
            () => `Checkbox [${field}] was not in indeterminate state.`,
        ).then(this.returnOrSelf);
    }

    public assertRadioSelected(field: string, value: string): Promise<Return | this> {
        const element = this.resolver.resolveForRadioSelection(field, value);
        return this.expects(
            true,
            () => element.checked,
            () => `Expected radio [${element}] to be selected, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertRadioNotSelected(
        field: string,
        value: string | null = null,
    ): Promise<Return | this> {
        const element = this.resolver.resolveForRadioSelection(field, value);
        return this.expects(
            false,
            () => element.checked,
            () => `Radio [${element}] was unexpectedly selected.`,
        ).then(this.returnOrSelf);
    }

    private selected(field: string, value: string | string[]): boolean {
        const selectedVals = this.resolver.resolveForSelection(field)?.selected() ?? [];
        const wanted = wrapArray(value);
        return wanted.every((v) => selectedVals.includes(v));
    }

    public assertSelected(field: string, value: string | string[]): Promise<Return | this> {
        const values = wrapArray(value);
        return this.expects(
            true,
            () => this.selected(field, values),
            () =>
                `Expected value [${values.join(
                    ',',
                )}] to be selected for [${field}], but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertNotSelected(
        field: string,
        value: string | string[],
    ): Promise<Return | this> {
        const values = wrapArray(value);
        return this.expects(
            false,
            () => this.selected(field, values),
            () =>
                `Unexpected value [${values.join(',')}] selected for [${field}].`,
        ).then(this.returnOrSelf);
    }

    public assertSelectHasOptions(field: string, values: string[]): Promise<Return | this> {
        const opts = this.resolver
            .resolveSelectOptions(field, values)
            .map((o: any) => o.value);
        const unique = [...new Set(opts)];
        return this.expects(
            values.length,
            unique.length,
            () =>
                `Expected options [${values.join(',')}] for selection field [${field}] to be available.`,
        ).then(this.returnOrSelf);
    }

    public assertSelectMissingOptions(field: string, values: string[]): Promise<Return | this> {
        const count = this.resolver.resolveSelectOptions(field, values).length;
        return this.expects(
            0,
            count,
            () =>
                `Unexpected options [${values.join(',')}] for selection field [${field}].`,
        ).then(this.returnOrSelf);
    }

    public assertSelectHasOption(field: string, value: string): Promise<Return | this> {
        return this.assertSelectHasOptions(field, [value]);
    }
    public assertSelectMissingOption(field: string, value: string): Promise<Return | this> {
        return this.assertSelectMissingOptions(field, [value]);
    }

    public assertValue(selector: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).value;
        return this.expects(
            value,
            actual,
            ({ expected, actual }) =>
                `Did not see expected value [${expected}] within element [${fullSelector}].`,
        ).then(this.returnOrSelf);
    }

    public assertValueIsNot(selector: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).value;
        return this.expects(
            value,
            actual,
            () => `Saw unexpected value [${value}] within element [${fullSelector}].`,
            (e, a) => e !== a,
        ).then(this.returnOrSelf);
    }

    private ensureElementSupportsValueAttribute(element: any, fullSelector: string): void {
        const allowed = [
            'textarea',
            'select',
            'button',
            'input',
            'li',
            'meter',
            'option',
            'param',
            'progress',
        ];
        if (!allowed.includes(element.tagName.toLowerCase())) {
            throw new Error(`This assertion cannot be used with the element [${fullSelector}].`);
        }
    }

    public assertAttribute(
        selector: string,
        attribute: string,
        value: string,
    ): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return this.expects(
            value,
            actual,
            () =>
                `Did not see expected attribute [${attribute}] within element [${fullSelector}].`,
        ).then(this.returnOrSelf);
    }

    public assertAttributeMissing(selector: string, attribute: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return this.expects(
            null,
            actual,
            () => `Saw unexpected attribute [${attribute}] within element [${fullSelector}].`,
        ).then(this.returnOrSelf);
    }

    public assertAttributeContains(
        selector: string,
        attribute: string,
        value: string,
    ): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return this.expects(
            value,
            actual,
            () =>
                `Attribute '${attribute}' does not contain [${value}]. Full attribute value was [${actual}].`,
            (e, a) => a.includes(e),
        ).then(this.returnOrSelf);
    }

    public assertAttributeDoesntContain(
        selector: string,
        attribute: string,
        value: string,
    ): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return this.expects(
            value,
            actual,
            () =>
                `Attribute '${attribute}' contains [${value}]. Full attribute value was [${actual}].`,
            (e, a) => !a.includes(e),
        ).then(this.returnOrSelf);
    }

    public assertAriaAttribute(
        selector: string,
        attribute: string,
        value: string,
    ): Promise<Return | this> {
        return this.assertAttribute(selector, `aria-${attribute}`, value);
    }
    public assertDataAttribute(
        selector: string,
        attribute: string,
        value: string,
    ): Promise<Return | this> {
        return this.assertAttribute(selector, `data-${attribute}`, value);
    }

    public assertVisible(selector: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        return this.expects(
            true,
            () => this.page.visible(fullSelector),
            () => `Element [${fullSelector}] is not visible.`,
        ).then(this.returnOrSelf);
    }

    public async assertPresent(
        selector: string,
        timeout = 5,
    ): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        if (timeout !== 0) {
            try {
                await this.page.waitForSelector(fullSelector, { timeout: timeout * 1000 });
            } catch (_) {}
        }
        return this.expects(
            true,
            () => this.resolver.find(selector) != null,
            () => `Element [${fullSelector}] is not present.`,
        ).then(this.returnOrSelf);
    }

    public assertNotPresent(selector: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        return this.expects(
            true,
            () => this.resolver.find(selector) == null,
            () => `Element [${fullSelector}] is present.`,
        ).then(this.returnOrSelf);
    }

    public async assertMissing(
        selector: string,
        timeout = 5,
    ): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        if (timeout !== 0) {
            try {
                await this.page.waitForSelector(fullSelector, { state: 'hidden', timeout: timeout * 1000 });
            } catch (_) {}
        }
        const missing = () => this.resolver.find(selector) == null;
        return this.expects(
            true,
            missing,
            () => `Saw unexpected element [${fullSelector}].`,
        ).then(this.returnOrSelf);
    }

    public async assertDialogOpened(message: string): Promise<Return | this> {
        const actual = await this.page.waitForEvent('dialog').then((d) => d.message());
        return this.expects(
            message,
            actual,
            ({ expected, actual }) =>
                `Expected dialog message [${expected}] does not equal actual message [${actual}].`,
        ).then(this.returnOrSelf);
    }

    public assertEnabled(field: any): Promise<Return | this> {
        const element = this.resolver.resolveForField(field);
        return this.expects(
            false,
            () => element.disabled,
            () => `Expected element [${element}] to be enabled, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertDisabled(field: any): Promise<Return | this> {
        const element = this.resolver.resolveForField(field);
        return this.expects(
            true,
            () => element.disabled,
            () => `Expected element [${element}] to be disabled, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertButtonEnabled(button: any): Promise<Return | this> {
        const element = this.resolver.resolveForButtonPress(button);
        return this.expects(
            false,
            () => element.disabled,
            () => `Expected button [${button}] to be enabled, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertButtonDisabled(button: string): Promise<Return | this> {
        const element = this.resolver.resolveForButtonPress(button);
        return this.expects(
            true,
            () => element.disabled,
            () => `Expected button [${button}] to be disabled, but it wasn't.`,
        ).then(this.returnOrSelf);
    }

    public assertFocused(field: string): Promise<Return | this> {
        const expected = this.resolver.resolveForField(field);
        const actual = () => this.page.focused();
        return this.expects(
            expected,
            actual,
            () => `Expected element [${field}] to be focused, but it wasn't.`,
            (e, a) => e === a,
        ).then(this.returnOrSelf);
    }

    public assertNotFocused(field: string): Promise<Return | this> {
        const expected = this.resolver.resolveForField(field);
        const actual = () => this.page.focused();
        return this.expects(
            expected,
            actual,
            () => `Element [${field}] was unexpectedly focused.`,
            (e, a) => e !== a,
        ).then(this.returnOrSelf);
    }

    public assertVue(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return this.expects(
            value,
            actual,
            () => `Vue attribute for key [${key}] mismatched.`,
        ).then(this.returnOrSelf);
    }

    public assertVueIsNot(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return this.expects(
            value,
            actual,
            () => `Vue attribute for key [${key}] should not equal [${value}].`,
            (e, a) => e !== a,
        ).then(this.returnOrSelf);
    }

    public assertVueContains(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return this.expects(
            value,
            actual,
            () => `The attribute for key [${key}] is not an array that contains [${value}].`,
            (e, a) => Array.isArray(a) && a.includes(e),
        ).then(this.returnOrSelf);
    }

    public assertVueDoesntContain(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return | this> {
        return this.assertVueDoesNotContain(key, value, componentSelector);
    }

    public assertVueDoesNotContain(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return this.expects(
            value,
            actual,
            () => `Vue attribute for key [${key}] should not contain [${value}].`,
            (e, a) => Array.isArray(a) && !a.includes(e),
        ).then(this.returnOrSelf);
    }

    public vueAttribute(componentSelector: string | null, key: string): any {
        const fullSelector = this.resolver.format(componentSelector);
        const script = `
        const el = document.querySelector('${fullSelector}');
        if (!el) return undefined;
        if (typeof el.__vue__ !== 'undefined') return el.__vue__.${key};
        try {
          const attr = el.__vueParentComponent.ctx.${key};
          if (typeof attr !== 'undefined') return attr;
        } catch (_) {}
        return el.__vueParentComponent.setupState.${key};
      `;
        return this.page.evaluate(script);
    }

    private async expects(expected, actual, message, compareFn?: ((expected, actual) => boolean)) {
        if (compareFn == null) {
            compareFn = ((e, a) => e == a);
        }
        expected = await this.resolveValue(expected);
        actual = await this.resolveValue(actual);
        message = await this.resolveValue(message, {expected, actual});

        return Promise.resolve(!compareFn(expected, actual) ? Return.ExpectationFailed(message, expected, actual) : undefined);
    }

    private async resolveValue(valueOfFunctionOrPromise, args = {}) {
        if (typeof valueOfFunctionOrPromise === 'function') {
            return valueOfFunctionOrPromise(args);
        }
        if (valueOfFunctionOrPromise?.constructor?.name === 'AsyncFunction') {
            return valueOfFunctionOrPromise(args);
        }
        if (valueOfFunctionOrPromise instanceof Promise) {
            return valueOfFunctionOrPromise
        }
        return valueOfFunctionOrPromise;
    }
}


