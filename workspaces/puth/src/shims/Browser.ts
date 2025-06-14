import { ElementHandle, Page, TimeoutError, Viewport, WaitForOptions } from 'puppeteer-core';
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

const isEqual = (expected: any, actual: any) => expected == actual;
const isNotEqual = (expected: any, actual: any) => expected != actual;
const isNull = (expected: any, actual: any) => actual == null;
const isNotNull = (expected: any, actual: any) => actual != null;
const isEmpty = (expected: any, actual: any) => actual == null || actual == '';
const isNotEmpty = (expected: any, actual: any) => actual != null && actual != '';

export async function expects(expected: any, actual: any, message: any, compareFn: ((expected: any, actual: any) => boolean)): Promise<void> {
    if (compareFn == null) {
        compareFn = ((e, a) => e == a);
    }
    expected = await resolveValue(expected);
    actual = await resolveValue(actual);

    if (!compareFn(expected, actual)) {
        throw new ExpectationFailed(
            await resolveValue(message, {expected, actual}),
            expected,
            actual,
        );
    }
}

export async function resolveValue(valueOfFunctionOrPromise: any, args = {}) {
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

export class ExpectationFailed extends Error {
    readonly expected: any;
    readonly actual: any;

    constructor(message: string, expected?: any, actual?: any) {
        super(message);

        this.expected = expected;
        this.actual = actual;
    }

    getReturnInstance(): Return {
        return Return.ExpectationFailed(this.message, this.expected, this.actual);
    }
}

export class Browser {
    private readonly context: Context;
    private readonly page: Page;

    private readonly self: () => this;

    public fitOnFailure: boolean = true;

    // timeout in milliseconds for wait functions
    public timeout: integer = 5000;

    constructor(context: Context, page: Page) {
        this.context = context;
        this.page = page;

        this.self = (): this => this;
    }

    public visit(url: string): Promise<this> {
        return this.page.goto(url).then(this.self);
    }

    public click(selector: string, options: any = {}): Promise<this> {
        return this.firstOrFail(selector)
            .then((element) => element.click(options))
            .then(this.self);
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
        return this.page
            .setViewport({
                width,
                height,
            })
            .then(this.self);
    }

    public move(x: number, y: number): Promise<this> {
        return move(this.page.browser(), x, y).then(this.self);
    }

    public scrollIntoView(selector: string): Promise<this> {
        return this.firstOrFail(selector)
            .then((element) => element.scrollIntoView())
            .then(this.self);
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

    public viewport(): Viewport | null {
        return this.page.viewport();
    }

    public getCookieByName(name: string): Promise<any> {
        return PuthStandardPlugin.getCookieByName(this.page, name) as any;
    }

    public setCookie(cookies: any[]): Promise<this> {
        return this.page.setCookie(...cookies).then(this.self);
    }

    public deleteCookie(cookies: any[] | string): Promise<this> {
        if (!Array.isArray(cookies)) {
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
        if (!html) {
            throw new Error('Element [html] not found on page.');
        }
        let [bounds, scrollWidth, scrollHeight] = await Promise.all([
            html.boundingBox(),
            html.getProperty('scrollWidth').then((h) => h.jsonValue()),
            html.getProperty('scrollHeight').then((h) => h.jsonValue()),
        ]);
        if (!bounds) {
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
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.value(element, value))
            .then(this.self);
    }

    public text(selector: string): Promise<string> {
        return this.attribute(selector, 'innertext');
    }

    public attribute(selector: string, attribute: string): Promise<string> {
        return this.firstOrFail(selector).then((element) => PuthStandardPlugin.its(element, attribute));
    }

    public type(selector: string[] | string, value: string, options = {}): Promise<this> {
        return this.firstOrFail(selector)
            .then((e) => PuthStandardPlugin.clear(e).then(() => type(e, value, options)))
            .then(this.self);
    }

    public typeSlowly(selector: string, value: string, pause: integer = 100): Promise<this> {
        return this.type(selector, value, { delay: pause });
    }

    public waitFor(
        selector: string[] | string,
        options?: { timeout?: integer; visible?: boolean; hidden?: boolean },
    ) {
        options = {timeout: this.timeout, hidden: false, visible: false, ...options};

        return (
            Array.isArray(selector)
                ? Promise.any(selector.map((s) => this.page.waitForSelector(s, options)))
                : this.page.waitForSelector(selector, options)
        ).catch((error) => {
            if (error instanceof TimeoutError) {
                throw new ExpectationFailed(this.createElementNotFoundMessage(selector));
            }
            throw error;
        });
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     * TODO implement timeout
     */
    public findAll(
        selector: string[] | string,
        options?: {} = {},
    ): Promise<ElementHandle[]> {
        return this.waitFor(selector, options).then((_) => {
            if (Array.isArray(selector)) {
                return Promise.all(selector.flatMap((s) => this.page.$$(s))).then((found) => found.flat());
            }

            return this.page.$$(selector);
        });
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     */
    public findOrFail(
        selector: string[] | string,
        options?: {} = {},
    ): Promise<ElementHandle[]> {
        return this.findAll(selector, options).then((elements) => {
            if (elements.length === 0) {
                throw new ExpectationFailed(this.createElementNotFoundMessage(selector));
            }

            return elements;
        });
    }

    /**
     * @gen-returns RemoteObject
     * TODO gen-returns should be ElementHandle
     */
    public firstOrFail(
        selector: string[] | string,
        options?: {} = {},
    ): Promise<ElementHandle> {
        return this.findOrFail(selector, options).then((found) => found[0]);
    }

    //// public keys(selector: string, keys: [string]|string) {
    ////
    //// }

    //// ASSERTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Assert that the page title is the given value.
    public assertTitle(title: string): Promise<Return | this> {
        return expects(
            title,
            this.page.title(),
            ({ actual }) => `Expected title [${title}] does not equal actual title [${actual}].`,
            isEqual,
        ).then(this.self);
    }

    // Assert that the page title contains the given value.
    public assertTitleContains(title: string): Promise<Return | this> {
        return expects(
            title,
            this.page.title(),
            ({ expected, actual }) => `Did not see expected value [${expected}] within title [${actual}].`,
            (expected, actual) => actual.includes(expected),
        ).then(this.self);
    }

    public async assertHasCookie(name: string): Promise<Return | this> {
        return expects(
            name,
            (await this.getCookieByName(name))?.value,
            ({ expected }) => `Did not find expected cookie [${expected}].`,
            isNotNull,
        ).then(this.self);
    }

    public async assertCookieMissing(name: string): Promise<Return | this> {
        return expects(
            name,
            (await this.getCookieByName(name))?.value,
            ({ expected }) => `Found unexpected cookie [${expected}].`,
            isNull,
        ).then(this.self);
    }

    public async assertCookieValue(name: string, value: string): Promise<Return | this> {
        return expects(
            value,
            (await this.getCookieByName(name))?.value?.value ?? '',
            ({ expected, actual }) =>
                `Cookie [${name}] had value [${actual?.value ?? ''}], but expected [${expected}].`,
            isEqual,
        ).then(this.self);
    }

    public assertSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertSeeIn('body', text, ignoreCase);
    }

    public assertDontSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertDontSeeIn('body', text, ignoreCase);
    }

    public assertSeeIn(selector: string, text: string, ignoreCase = false): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) =>
                expects(
                    text,
                    actual,
                    ({ expected, actual }) => `Did not see expected text [${expected}] within element [${selector}].`,
                    (e: string, a: string) => (ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e)),
                ),
            )
            .then(this.self);
    }

    public assertDontSeeIn(selector: string, text: string, ignoreCase = false): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) =>
                expects(
                    text,
                    actual,
                    ({ expected }) => `Saw unexpected text [${expected}] within element [${selector}].`,
                    (e, a) => !(ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e)),
                ),
            )
            .then(this.self);
    }

    public assertSeeAnythingIn(selector: string): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) =>
                expects('', actual, () => `Saw unexpected text [''] within element [${selector}].`, isNotEmpty),
            )
            .then(this.self);
    }

    public assertSeeNothingIn(selector: string): Promise<Return | this> {
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) =>
                expects('', actual, () => `Did not see expected text [''] within element [${selector}].`, isEmpty),
            )
            .then(this.self);
    }

    public async assertScript(expression: string, expected: any = true): Promise<Return | this> {
        return expects(
            expected,
            this.page.evaluate(expression),
            () => `JavaScript expression [${expression}] mismatched.`,
            isEqual,
        ).then(this.self);
    }

    public assertSourceHas(code: string): Promise<Return | this> {
        return expects(
            code,
            this.page.content(),
            ({ expected }) => `Did not find expected source code [${expected}]`,
            (e, a) => a.includes(e),
        ).then(this.self);
    }

    public assertSourceMissing(code: string): Promise<Return | this> {
        return expects(
            code,
            this.page.content(),
            ({ expected }) => `Found unexpected source code [${expected}]`,
            (e, a) => !a.includes(e),
        ).then(this.self);
    }

    public assertSeeLink(link: string, selector: string = 'a'): Promise<Return | this> {
        link = link.replace("'", "\\'");
        return this.assertVisible(`${selector}[href='${link}']`);
    }

    public assertDontSeeLink(link: string, selector: string = 'a'): Promise<Return | this> {
        link = link.replace("'", "\\'");
        return this.assertMissing(`${selector}[href='${link}']`);
    }

    public assertInputValue(field: any, value: string): Promise<Return | this> {
        const actual = () => this.inputValue(field);
        return expects(
            value,
            actual,
            ({ expected, actual }) =>
                `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
        ).then(this.self);
    }

    public assertInputValueIsNot(field: any, value: string): Promise<Return | this> {
        const actual = () => this.inputValue(field);
        return expects(
            value,
            actual,
            () => `Value [${value}] for the [${field}] input should not equal the actual value.`,
            (e, a) => e !== a,
        ).then(this.self);
    }

    public inputValue(field: any): string {
        return this.resolver.resolveForTyping(field).value();
    }

    public async assertInputPresent(field: string, timeout = 5): Promise<Return | this> {
        await this.assertPresent(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
        return this;
    }

    public async assertInputMissing(field: string, timeout = 5): Promise<Return | this> {
        await this.assertMissing(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
        return this;
    }

    public assertChecked(field: string, value: string | null = null): Promise<Return | this> {
        const element = this.resolver.resolveForChecking(field, value);
        return expects(
            true,
            () => element.checked,
            () => `Expected checkbox [${element}] to be checked, but it wasn't.`,
        ).then(this.self);
    }

    public assertNotChecked(field: string, value: string | null = null): Promise<Return | this> {
        const element = this.resolver.resolveForChecking(field, value);
        return expects(
            false,
            () => element.checked,
            () => `Checkbox [${element}] was unexpectedly checked.`,
        ).then(this.self);
    }

    public async assertIndeterminate(field: string, value: string | null = null): Promise<Return | this> {
        await this.assertNotChecked(field, value);
        return expects(
            true,
            () => this.resolver.findOrFail(field).indeterminate,
            () => `Checkbox [${field}] was not in indeterminate state.`,
        ).then(this.self);
    }

    public assertRadioSelected(field: string, value: string): Promise<Return | this> {
        const element = this.resolver.resolveForRadioSelection(field, value);
        return expects(
            true,
            () => element.checked,
            () => `Expected radio [${element}] to be selected, but it wasn't.`,
        ).then(this.self);
    }

    public assertRadioNotSelected(field: string, value: string | null = null): Promise<Return | this> {
        const element = this.resolver.resolveForRadioSelection(field, value);
        return expects(
            false,
            () => element.checked,
            () => `Radio [${element}] was unexpectedly selected.`,
        ).then(this.self);
    }

    private selected(field: string, value: string | string[]): boolean {
        const selectedVals = this.resolver.resolveForSelection(field)?.selected() ?? [];
        const wanted = wrapArray(value);
        return wanted.every((v) => selectedVals.includes(v));
    }

    public assertSelected(field: string, value: string | string[]): Promise<Return | this> {
        const values = wrapArray(value);
        return expects(
            true,
            () => this.selected(field, values),
            () => `Expected value [${values.join(',')}] to be selected for [${field}], but it wasn't.`,
        ).then(this.self);
    }

    public assertNotSelected(field: string, value: string | string[]): Promise<Return | this> {
        const values = wrapArray(value);
        return expects(
            false,
            () => this.selected(field, values),
            () => `Unexpected value [${values.join(',')}] selected for [${field}].`,
        ).then(this.self);
    }

    public assertSelectHasOptions(field: string, values: string[]): Promise<Return | this> {
        const opts = this.resolver.resolveSelectOptions(field, values).map((o: any) => o.value);
        const unique = [...new Set(opts)];
        return expects(
            values.length,
            unique.length,
            () => `Expected options [${values.join(',')}] for selection field [${field}] to be available.`,
        ).then(this.self);
    }

    public assertSelectMissingOptions(field: string, values: string[]): Promise<Return | this> {
        const count = this.resolver.resolveSelectOptions(field, values).length;
        return expects(0, count, () => `Unexpected options [${values.join(',')}] for selection field [${field}].`).then(
            this.self,
        );
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
        return expects(
            value,
            actual,
            ({ expected, actual }) => `Did not see expected value [${expected}] within element [${fullSelector}].`,
        ).then(this.self);
    }

    public assertValueIsNot(selector: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).value;
        return expects(
            value,
            actual,
            () => `Saw unexpected value [${value}] within element [${fullSelector}].`,
            (e, a) => e !== a,
        ).then(this.self);
    }

    private ensureElementSupportsValueAttribute(element: any, fullSelector: string): void {
        const allowed = ['textarea', 'select', 'button', 'input', 'li', 'meter', 'option', 'param', 'progress'];
        if (!allowed.includes(element.tagName.toLowerCase())) {
            throw new Error(`This assertion cannot be used with the element [${fullSelector}].`);
        }
    }

    public assertAttribute(selector: string, attribute: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return expects(
            value,
            actual,
            () => `Did not see expected attribute [${attribute}] within element [${fullSelector}].`,
        ).then(this.self);
    }

    public assertAttributeMissing(selector: string, attribute: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return expects(
            null,
            actual,
            () => `Saw unexpected attribute [${attribute}] within element [${fullSelector}].`,
        ).then(this.self);
    }

    public assertAttributeContains(selector: string, attribute: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return expects(
            value,
            actual,
            () => `Attribute '${attribute}' does not contain [${value}]. Full attribute value was [${actual}].`,
            (e, a) => a.includes(e),
        ).then(this.self);
    }

    public assertAttributeDoesntContain(selector: string, attribute: string, value: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        const actual = () => this.resolver.findOrFail(selector).its(attribute);
        return expects(
            value,
            actual,
            () => `Attribute '${attribute}' contains [${value}]. Full attribute value was [${actual}].`,
            (e, a) => !a.includes(e),
        ).then(this.self);
    }

    public assertAriaAttribute(selector: string, attribute: string, value: string): Promise<Return | this> {
        return this.assertAttribute(selector, `aria-${attribute}`, value);
    }

    public assertDataAttribute(selector: string, attribute: string, value: string): Promise<Return | this> {
        return this.assertAttribute(selector, `data-${attribute}`, value);
    }

    public async assertVisible(
        selector: string,
        options: { timeout: integer } = { timeout: 5000 },
    ): Promise<Return | this> {
        return this.waitFor(selector, { ...options, visible: true })
            .then((element) => expects(null, element, `Element [${selector}] is not visible.`, isNotNull))
            .then(this.self);
    }

    public async assertMissing(
        selector: string,
        options: { timeout: integer } = { timeout: 5000 },
    ): Promise<Return | this> {
        return this.waitFor(selector, { ...options, hidden: true })
            .then((element) => expects(null, element, `Saw unexpected element [${selector}].`, isNull))
            .then(this.self);
    }

    public async assertPresent(selector: string, timeout = 5): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        if (timeout !== 0) {
            try {
                await this.page.waitForSelector(fullSelector, { timeout: timeout * 1000 });
            } catch (_) {}
        }
        return expects(
            true,
            () => this.resolver.find(selector) != null,
            () => `Element [${fullSelector}] is not present.`,
        ).then(this.self);
    }

    public assertNotPresent(selector: string): Promise<Return | this> {
        const fullSelector = this.resolver.format(selector);
        return expects(
            true,
            () => this.resolver.find(selector) == null,
            () => `Element [${fullSelector}] is present.`,
        ).then(this.self);
    }

    public async assertDialogOpened(message: string): Promise<Return | this> {
        const actual = await this.page.waitForEvent('dialog').then((d) => d.message());
        return expects(
            message,
            actual,
            ({ expected, actual }) =>
                `Expected dialog message [${expected}] does not equal actual message [${actual}].`,
        ).then(this.self);
    }

    public assertEnabled(field: any): Promise<Return | this> {
        const element = this.resolver.resolveForField(field);
        return expects(
            false,
            () => element.disabled,
            () => `Expected element [${element}] to be enabled, but it wasn't.`,
        ).then(this.self);
    }

    public assertDisabled(field: any): Promise<Return | this> {
        const element = this.resolver.resolveForField(field);
        return expects(
            true,
            () => element.disabled,
            () => `Expected element [${element}] to be disabled, but it wasn't.`,
        ).then(this.self);
    }

    public assertButtonEnabled(button: any): Promise<Return | this> {
        const element = this.resolver.resolveForButtonPress(button);
        return expects(
            false,
            () => element.disabled,
            () => `Expected button [${button}] to be enabled, but it wasn't.`,
        ).then(this.self);
    }

    public assertButtonDisabled(button: string): Promise<Return | this> {
        const element = this.resolver.resolveForButtonPress(button);
        return expects(
            true,
            () => element.disabled,
            () => `Expected button [${button}] to be disabled, but it wasn't.`,
        ).then(this.self);
    }

    public assertFocused(field: string): Promise<Return | this> {
        const expected = this.resolver.resolveForField(field);
        const actual = () => this.page.focused();
        return expects(
            expected,
            actual,
            () => `Expected element [${field}] to be focused, but it wasn't.`,
            (e, a) => e === a,
        ).then(this.self);
    }

    public assertNotFocused(field: string): Promise<Return | this> {
        const expected = this.resolver.resolveForField(field);
        const actual = () => this.page.focused();
        return expects(
            expected,
            actual,
            () => `Element [${field}] was unexpectedly focused.`,
            (e, a) => e !== a,
        ).then(this.self);
    }

    public assertVue(key: string, value: any, componentSelector: string | null = null): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(value, actual, () => `Vue attribute for key [${key}] mismatched.`).then(this.self);
    }

    public assertVueIsNot(key: string, value: any, componentSelector: string | null = null): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(
            value,
            actual,
            () => `Vue attribute for key [${key}] should not equal [${value}].`,
            (e, a) => e !== a,
        ).then(this.self);
    }

    public assertVueContains(key: string, value: any, componentSelector: string | null = null): Promise<Return | this> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(
            value,
            actual,
            () => `The attribute for key [${key}] is not an array that contains [${value}].`,
            (e, a) => Array.isArray(a) && a.includes(e),
        ).then(this.self);
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
        return expects(
            value,
            actual,
            () => `Vue attribute for key [${key}] should not contain [${value}].`,
            (e, a) => Array.isArray(a) && !a.includes(e),
        ).then(this.self);
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

    private createElementNotFoundMessage(selector: string[] | string) {
        return `Element [${Array.isArray(selector) ? selector.join(' | ') : selector}] not found.`;
    }
}


