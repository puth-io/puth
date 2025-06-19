import { Browser as PPTRBrowser, ElementHandle, Frame, Page, TimeoutError, Viewport, WaitForOptions } from 'puppeteer-core';
import Context from '../Context';
import { getWindowBounds, maximize, move, setWindowBounds } from '../plugins/Std/PuthBrowserExtensions';
import { PuthStandardPlugin } from '../index';
import { type } from '../plugins/utils/cy';
import { Return } from '@puth/puth/src/context/Return';
import {clearTimeout} from 'node:timers';

// TODO
// @gen-class ElementHandle
// interface ElementHandle {
//     children: () => ElementHandle[];
// }

export type integer = number;

const isEqualTo = (expected: any, actual: any) => expected == actual;
const isNotEqual = (expected: any, actual: any) => expected != actual;
const isNull = (expected: any, actual: any) => actual == null;
const isNotNull = (expected: any, actual: any) => actual != null;
const isEmpty = (expected: any, actual: any) => actual == null || actual == '';
const isNotEmpty = (expected: any, actual: any) => actual != null && actual != '';

export async function expects(
    expected: any,
    actual: any,
    message: any,
    compareFn: (expected: any, actual: any) => boolean,
): Promise<void> {
    if (compareFn == null) {
        compareFn = (e, a) => e == a;
    }
    expected = await resolveValue(expected);
    actual = await resolveValue(actual);

    if (!compareFn(expected, actual)) {
        throw new ExpectationFailed(await resolveValue(message, { expected, actual }), expected, actual);
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
        return valueOfFunctionOrPromise;
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

export class UnsupportedException extends Error {}

export class Browser {
    private readonly context: Context;
    private readonly browser: PPTRBrowser;
    private readonly site: Page | Frame;

    private readonly self: () => this;

    public fitOnFailure: boolean = true;

    // timeout in milliseconds for wait functions
    public timeout: integer = 3000;

    public resolverDuskSelectorHtmlAttribute: string = 'dusk';
    public resolverPrefix: string = 'body';
    public resolverPageElements: {} = {};

    constructor(context: Context, page: Page | Frame) {
        this.context = context;
        this.browser = page instanceof Page ? page.browser() : page.page().browser();
        this.site = page;

        this.self = (): this => this;
    }

    public clone(): Browser {
        return new Browser(this.context, this.site);
    }

    public setResolverPrefix(prefix: string): this {
        this.resolverPrefix = prefix;
        return this;
    }

    public setResolverPageElements(pageElements: {}): this {
        this.resolverPageElements = pageElements;
        return this;
    }

    public visit(url: string): Promise<this> {
        return this.site.goto(url).then(this.self);
    }

    public click(selector: string, options: any = {}): Promise<this> {
        return this.firstOrFail(selector)
            .then((element) => element.click(options))
            .then(this.self);
    }

    public setContent(html: string, options: WaitForOptions = {}): Promise<this> {
        return this.site.setContent(html, options).then(this.self);
    }

    public blank(): Promise<this> {
        return this.visit('about:blank').then(this.self);
    }

    public refresh(options = {}): Promise<this> {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [refresh] on a frame is not supported.');
        }

        return this.site.reload(options).then(this.self);
    }

    // Navigate to the previous page.
    public back(options = {}): Promise<this> {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [back] on a frame is not supported.');
        }

        return this.site.goBack(options).then(this.self);
    }

    // Navigate to the next page.
    public forward(options = {}): Promise<this> {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [forward] on a frame is not supported.');
        }

        return this.site.goForward(options).then(this.self);
    }

    public maximize(): Promise<this> {
        return maximize(this.browser).then(this.self);
    }

    public bounds(): Promise<object> {
        return getWindowBounds(this.browser);
    }

    public setBounds(bounds: any): Promise<this> {
        return setWindowBounds(this.browser, bounds).then(this.self);
    }

    public resize(width, height): Promise<this> {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [resize] on a frame is not supported.');
        }

        return this.site
            .setViewport({
                width,
                height,
            })
            .then(this.self);
    }

    public move(x: number, y: number): Promise<this> {
        return move(this.browser, x, y).then(this.self);
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
        return this.site.evaluate(pageFunction, ...args);
    }

    public quit(): Promise<void> {
        return this.context.destroyBrowserByBrowser(this.browser);
    }

    public url(): string {
        return this.site.url();
    }

    public async title(): Promise<string> {
        return this.site.title();
    }

    public content(): Promise<string> {
        return this.site.content();
    }

    public viewport(): Viewport | null {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [viewport] on a frame is not supported.');
        }

        return this.site.viewport();
    }

    public getCookieByName(name: string): Promise<any> {
        // TODO implement for frame - use Browser cookies instead of deprecated page cookies
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [viewport] on a frame is currently not supported.');
        }

        return PuthStandardPlugin.getCookieByName(this.site, name) as any;
    }

    public setCookie(cookies: any[]): Promise<this> {
        // TODO implement for frame - use Browser cookies instead of deprecated page cookies
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [setCookie] on a frame is currently not supported.');
        }

        return this.site.setCookie(...cookies).then(this.self);
    }

    public deleteCookie(cookies: any[] | string): Promise<this> {
        // TODO implement for frame - use Browser cookies instead of deprecated page cookies
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [viewport] on a frame is currently not supported.');
        }

        if (!Array.isArray(cookies)) {
            cookies = [{ name: cookies }];
        }

        return this.site.deleteCookie(...cookies).then(this.self);
    }

    public screenshot(options = {}): Promise<Uint8Array> {
        if (!this.isPage()) {
            throw new UnsupportedException('Calling [screenshot] on a frame is currently not supported.');
        }

        return this.site.screenshot(options);
    }

    // Make the browser window as large as the content
    public async fitContent(): Promise<this> {
        let html = await this.site.$('html');
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
        options?: { timeout?: integer; state?: 'visible' | 'hidden' | 'present' | 'missing' },
    ) {
        options = { state: 'present', timeout: this.timeout, ...options } as any;

        if (options?.state === 'missing') {
            return this.waitForNotPresent(selector as string, { timeout: options?.timeout ?? this.timeout }).catch(
                (error) => {
                    console.error('selector is still present...');
                },
            );
        } else if (options?.state === 'visible') {
            options.visible = true;
        } else if (options?.state === 'hidden') {
            options.hidden = true;
        }

        return (
            Array.isArray(selector)
                ? Promise.any(selector.map((s) => this.site.waitForSelector(s, options)))
                : this.site.waitForSelector(selector, options)
        ).catch((error) => {
            if (error instanceof AggregateError) {
                error = error.errors[0];
            }
            if (error instanceof TimeoutError) {
                throw new ExpectationFailed(
                    `Waited ${options?.timeout ?? this.timeout}ms for selector [${
                        Array.isArray(selector) ? selector.join(' | ') : selector
                    }]`,
                );
            }
            throw error;
        });
    }

    public waitForNotPresent(selector: string, options: {} = {}) {
        return this.site
            .waitForFunction(
                (s) => document.querySelector(s) === null,
                { timeout: this.timeout, ...options, polling: 'mutation' },
                selector,
            )
            .then(this.self);
    }

    public waitForTextIn(
        selector: string,
        text: string[] | string,
        options: { timeout?: integer; ignoreCase?: boolean; missing?: boolean } = {},
    ) {
        if (!Array.isArray(text)) {
            text = [text];
        }

        return this.waitUntil(
            (t, s, ic, m) => {
                let innerText = document.querySelector(s)?.innerText;
                if (ic) {
                    innerText = innerText?.toLowerCase();
                    t = t.map((_t) => _t?.toLowerCase());
                }
                for (let _t of t) {
                    if (!innerText.includes(_t)) {
                        return m;
                    }
                }
                return !m;
            },
            [text, selector, options?.ignoreCase ?? false, options?.missing ?? false],
            `Waited ${options?.timeout ?? this.timeout}ms for text "${text}" in selector [${
                Array.isArray(selector) ? selector.join(' | ') : selector
            }]`,
            options,
        );
    }

    public waitUntil(pageFunction, args: any[], message: string, options: {} = {}) {
        return this.site
            .waitForFunction(pageFunction, { timeout: this.timeout, ...options }, ...args)
            .catch((error) => {
                if (error instanceof TimeoutError) {
                    throw new ExpectationFailed(message);
                }
                throw error;
            })
            .then(this.self);
    }

    public waitUntilAttribute(selector: string, attribute: string, value: any, message: string, options: {} = {}) {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return this.waitFor(selector, options).then((_) =>
            this.waitUntil(
                (s, a, v) => v.includes(document.querySelector(s)?.[a]),
                [selector, attribute, value],
                message,
                options,
            ),
        );
    }

    public waitUntilEnabled(selector: string, options: {} = {}) {
        return this.waitUntilAttribute(
            selector,
            'disabled',
            [undefined, null, false],
            `Waited %s seconds for element to be enabled`,
            options,
        );
    }

    public waitUntilDisabled(selector: string, options: {} = {}) {
        return this.waitUntilAttribute(
            selector,
            'disabled',
            [true],
            `Waited %s seconds for element to be disabled`,
            options,
        );
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     * TODO implement timeout
     */
    public findAll(selector: string[] | string, options?: {} = {}): Promise<ElementHandle[]> {
        return this.waitFor(selector, options).then((_) => {
            if (Array.isArray(selector)) {
                return Promise.allSettled(selector.flatMap((s) => this.site.$$(s)))
                    .then(settled => settled.map(s => s?.value ?? null))
                    .then(found => found.filter(f => !!f))
                    .then(found => found.flat());
            }

            return this.site.$$(selector);
        });
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     */
    public findOrFail(selector: string[] | string, options?: {} = {}): Promise<ElementHandle[]> {
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
    public firstOrFail(selector: string[] | string, options?: {} = {}): Promise<ElementHandle> {
        return this.findOrFail(selector, options).then((found) => found[0]);
    }

    //// public keys(selector: string, keys: [string]|string) {
    ////
    //// }

    //// ELEMENT INTERACTION ///////////////////////////////////////////////////////////////////////////////////////////

    // Press the button with the given text or name.
    public press(button: string): Promise<this> {
        return this.resolveForButtonPress(button).then(element => element.click()).then(this.self);
    }

    // Press the button with the given text or name.
    public pressAndWaitFor(button: string): Promise<this> {
        return this.resolveForButtonPress(button)
            .then(async element => element.click().then(_ =>
                this.expectsEH((handle, expected) => !!handle.disabled === expected, element, false, `Expected element [${button}] to be enabled, but it wasn't.`)
            ))
            .then(this.self);
    }


    //// ASSERTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Assert that the page title is the given value.
    public assertTitle(title: string): Promise<Return | this> {
        return expects(
            title,
            this.site.title(),
            ({ actual }) => `Expected title [${title}] does not equal actual title [${actual}].`,
            isEqualTo,
        ).then(this.self);
    }

    // Assert that the page title contains the given value.
    public assertTitleContains(title: string): Promise<Return | this> {
        return expects(
            title,
            this.site.title(),
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
            isEqualTo,
        ).then(this.self);
    }

    public assertSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertSeeIn('', text, ignoreCase);
    }

    public assertDontSee(text: string, ignoreCase: boolean = false): Promise<Return | this> {
        return this.assertDontSeeIn('', text, ignoreCase);
    }

    public assertSeeIn(selector: string, text: string, ignoreCase = false): Promise<Return | this> {
        return this.firstOrFail(this.resolver(selector))
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
        return this.firstOrFail(this.resolver(selector))
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
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects('', actual, () => `Saw unexpected text [''] within element [${selector}].`, isNotEmpty))
            .then(this.self);
    }

    public assertSeeNothingIn(selector: string): Promise<Return | this> {
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects('', actual, () => `Did not see expected text [''] within element [${selector}].`, isEmpty))
            .then(this.self);
    }

    public async assertScript(expression: string, expected: any = true): Promise<Return | this> {
        return expects(
            expected,
            this.site.evaluate(expression),
            () => `JavaScript expression [${expression}] mismatched.`,
            isEqualTo,
        ).then(this.self);
    }

    public assertSourceHas(code: string): Promise<Return | this> {
        return expects(
            code,
            this.site.content(),
            ({ expected }) => `Did not find expected source code [${expected}]`,
            (e, a) => a.includes(e),
        ).then(this.self);
    }

    public assertSourceMissing(code: string): Promise<Return | this> {
        return expects(
            code,
            this.site.content(),
            ({ expected }) => `Found unexpected source code [${expected}]`,
            (e, a) => !a.includes(e),
        ).then(this.self);
    }

    // Assert that the given link is present on the page
    public assertSeeLink(link: string, selector: string = 'a'): Promise<Return | this> {
        link = link.replace("'", "\\'");
        return this.assertVisible(`${selector}[href='${link}']`);
    }

    // Assert that the given link is not present on the page
    public assertDontSeeLink(link: string, selector: string = 'a'): Promise<Return | this> {
        link = link.replace("'", "\\'");
        return this.assertMissing(`${selector}[href='${link}']`);
    }

    public assertInputValue(field: any, value: string): Promise<this> {
        return this.resolveForTyping(field).then(element => expects(
            value,
            PuthStandardPlugin.its(element, 'value'),
            ({ expected, actual }) =>
                `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
            isEqualTo,
        )).then(this.self);
    }

    public assertInputValueIsNot(field: any, value: string): Promise<Return | this> {
        return this.resolveForTyping(field).then(element => expects(
            value,
            PuthStandardPlugin.its(element, 'value'),
            ({ expected, actual }) =>
                `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
            isNotEqual,
        )).then(this.self);
    }

    public resolveForTyping(selector: string) {
        let selectors: string[] = [];
        if (selector?.startsWith('#')) {
            selectors.push(selector);
        }
        selectors.push(`input[name='${selector}']`);
        selectors.push(`textarea[name='${selector}']`);
        selectors.push(selector);

        return this.firstOrFail(selectors);
    }

    public resolveForChecking(field: string|null, value: string|null = null) {
        let selectors: string[] = [];
        if (field?.startsWith('#')) {
            selectors.push(field);
        }

        let selector = 'input[type=checkbox]';
        if (field != null) {
            selector += `[name='${field}']`;
        }
        if (value != null) {
            selector += `[value='${value}']`;
        }
        selectors.push(selector);
        if (field != null) {
            selectors.push(field);
        }

        return this.firstOrFail(selectors);
    }

    public resolveForRadioSelection(field: string|null, value: string|null = null) {
        let selectors: string[] = [];
        if (field?.startsWith('#')) {
            selectors.push(field);
        }

        let selector = 'input[type=radio]';
        if (field != null) {
            selector += `[name='${field}']`;
        }
        if (value != null) {
            selector += `[value='${value}']`;
        }
        selectors.push(selector);
        if (field != null) {
            selectors.push(field);
        }

        return this.firstOrFail(selectors);
    }

    public resolveForSelection(field: string) {
        let selectors: string[] = [];
        if (field?.startsWith('#')) {
            selectors.push(field);
        }
        selectors.push(`select[name='${field}']`);
        selectors.push(field);

        return this.firstOrFail(selectors);
    }

    public resolveSelectOptions(field: string) {
        return this.resolveForSelection(field)
            .then(el => el.evaluateHandle(handle => [...handle.options].map(o => o.value)))
            .then(handle => handle.jsonValue());
    }

    public resolveForField(field: string) {
        let selectors: string[] = [];
        if (field?.startsWith('#')) {
            selectors.push(field);
        }
        selectors.push(`input[name='${field}']`);
        selectors.push(`textarea[name='${field}']`);
        selectors.push(`select[name='${field}']`);
        selectors.push(`button[name='${field}']`);
        selectors.push(field);

        return this.firstOrFail(this.resolver(selectors));
    }

    public resolveForButtonPress(field: string): Promise<ElementHandle> {
        let selectors: string[] = [field];

        selectors.push(`input[type=submit][name='${field}']`);
        selectors.push(`input[type=button][value='${field}']`);
        selectors.push(`button[name='${field}']`);

        return Promise.any([
            this.firstOrFail(this.resolver(selectors)),
            this.site.waitForFunction(
                (selector, text) => {
                    let els = document.querySelectorAll(selector);
                    for (let i = 0; i < els.length; i++) {
                        if (els[i]?.value == text) {
                            return els[i];
                        }
                    }
                },
                { timeout: this.timeout, polling: 'mutation' },
                this.resolver('input[type=submit]'),
                field,
            ) as Promise<ElementHandle>,
            this.site.waitForFunction(
                (selector, text) => {
                    let els = document.querySelectorAll(selector);
                    for (let i = 0; i < els.length; i++) {
                        if (els[i]?.innerText.includes(text)) {
                            return els[i];
                        }
                    }
                },
                { timeout: this.timeout, polling: 'mutation' },
                this.resolver('button'),
                field,
            ) as Promise<ElementHandle>,
        ]).catch((error) => {
            if (error instanceof AggregateError) {
                error = error.errors[0];
            }
            if (error instanceof TimeoutError || error instanceof ExpectationFailed) {
                throw new ExpectationFailed(`Unable to locate button [${field}]`);
            }
            throw error;
        });
    }

    public inputValue(field: any): string {
        return this.resolveForTyping(field).value();
    }

    public async assertInputPresent(field: string, timeout = 5): Promise<Return | this> {
        await this.assertPresent(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
        return this;
    }

    public async assertInputMissing(field: string, timeout = 5): Promise<Return | this> {
        await this.assertMissing(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
        return this;
    }

    private _assertProperty(element: Promise<ElementHandle>, property, compareFn, expected, message) {
        return element.then(element => expects(expected, PuthStandardPlugin.its(element, property), message, compareFn)).then(this.self);
    }

    public assertChecked(field: string, value: string|null = null): Promise<Return | this> {
        return this._assertProperty(this.resolveForChecking(field, value), 'checked', isEqualTo, true, `Expected checkbox [${field}] to be checked, but it wasn't.`);
    }

    public assertNotChecked(field: string, value: string|null = null): Promise<Return | this> {
        return this._assertProperty(this.resolveForChecking(field, value), 'checked', isEqualTo, false, `Checkbox [${field}] was unexpectedly checked.`);
    }

    public async assertIndeterminate(field: string, value: string | null = null): Promise<Return | this> {
        return this.assertNotChecked(field, value)
            .then(_ => this.firstOrFail(this.resolver(field)))
            .then(element => expects(
                true,
                PuthStandardPlugin.attr(element, 'indeterminate'),
                `Checkbox [${field}] was not in indeterminate state.`,
                isEqualTo,
        )).then(this.self);
    }

    public assertRadioSelected(field: string, value: string): Promise<Return | this> {
        return this._assertProperty(this.resolveForRadioSelection(field, value), 'checked', isEqualTo, true, `Expected radio [${field}] to be selected, but it wasn't.`);
    }

    public assertRadioNotSelected(field: string, value: string | null = null): Promise<Return | this> {
        return this._assertProperty(this.resolveForRadioSelection(field, value), 'checked', isEqualTo, false, `Radio [${field}] was unexpectedly selected.`);
    }

    private selected(field: string, value: string[]|string): Promise<boolean> {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return this.resolveForSelection(field)
            .then(el => PuthStandardPlugin.selected(el))
            .then(selected => value.every(v => selected.includes(v)));
    }

    public assertSelected(field: string, value: string[]|string): Promise<Return | this> {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return expects(
            true,
            this.selected(field, value),
            `Expected value [${value.join(',')}] to be selected for [${field}], but it wasn't.`,
            isEqualTo,
        ).then(this.self);
    }

    public assertNotSelected(field: string, value: string[]|string): Promise<Return | this> {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return expects(
            false,
            this.selected(field, value),
            `Unexpected value [${value.join(',')}] selected for [${field}].`,
            isEqualTo,
        ).then(this.self);
    }

    public assertSelectHasOptions(field: string, values: string[]): Promise<Return | this> {
        return this.resolveSelectOptions(field).then(selectable => expects(
            true,
            values.every(v => selectable.includes(v)),
            () => `Expected options [${values.join(',')}] for selection field [${field}] to be available.`,
            isEqualTo,
        )).then(this.self);
    }

    public assertSelectMissingOptions(field: string, values: string[]): Promise<Return | this> {
        return this.resolveSelectOptions(field).then(selectable => expects(
            false,
            selectable.some(s => values.includes(s)),
            () => `Unexpected options [${values.join(',')}] for selection field [${field}].`,
            isEqualTo,
        )).then(this.self);
    }

    public assertSelectHasOption(field: string, value: string): Promise<Return | this> {
        return this.assertSelectHasOptions(field, [value]);
    }

    public assertSelectMissingOption(field: string, value: string): Promise<Return | this> {
        return this.assertSelectMissingOptions(field, [value]);
    }

    public assertValue(selector: string, value: string): Promise<Return | this> {
        return this.firstOrFail(this.resolver(selector)).then(el => expects(
            value,
            PuthStandardPlugin.its(el, 'value'),
            `Did not see expected value [${value}] within element [${this.resolver(selector)}].`,
            isEqualTo,
        )).then(this.self);
    }

    public assertValueIsNot(selector: string, value: string): Promise<Return | this> {
        return this.firstOrFail(this.resolver(selector)).then(el => expects(
            value,
            PuthStandardPlugin.its(el, 'value'),
            `Saw unexpected value [${value}] within element [${this.resolver(selector)}].`,
            isNotEqual,
        )).then(this.self);
    }

    // private ensureElementSupportsValueAttribute(element: any, fullSelector: string): void {
    //     const allowed = ['textarea', 'select', 'button', 'input', 'li', 'meter', 'option', 'param', 'progress'];
    //     if (!allowed.includes(element.tagName.toLowerCase())) {
    //         throw new Error(`This assertion cannot be used with the element [${fullSelector}].`);
    //     }
    // }

    public assertAttribute(selector: string, attribute: string, value: string): Promise<Return | this> {
        let fullSelector = this.resolver(selector);
        return this.firstOrFail(fullSelector).then(el => expects(
            value,
            PuthStandardPlugin.attr(el, attribute),
            `Did not see expected attribute [${attribute}] within element [${fullSelector}].`,
            isEqualTo,
        )).then(this.self);
    }

    public assertAttributeMissing(selector: string, attribute: string): Promise<Return | this> {
        let fullSelector = this.resolver(selector);
        return this.firstOrFail(fullSelector).then(el => expects(
            null,
            PuthStandardPlugin.attr(el, attribute),
            `Saw unexpected attribute [${attribute}] within element [${fullSelector}].`,
            isEqualTo,
        )).then(this.self);
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

    public async assertVisible(selector: string, options: {} = {}): Promise<Return | this> {
        return this.waitFor(this.resolver(selector), { ...options, state: 'visible' })
            .then((element) => expects(null, element, `Element [${selector}] is not visible.`, isNotNull))
            .then(this.self);
    }

    public async assertMissing(selector: string, options: {} = {}): Promise<Return | this> {
        return this.waitFor(this.resolver(selector), { ...options, state: 'hidden' })
            .then((element) => expects(null, element, `Saw unexpected element [${selector}].`, isNull))
            .then(this.self);
    }

    public async assertPresent(selector: string, options: {} = {}): Promise<Return | this> {
        return this.waitFor(this.resolver(selector), options).then(this.self);
    }

    public assertNotPresent(selector: string, options: {} = {}): Promise<Return | this> {
        return this.waitForNotPresent(this.resolver(selector));
    }

    // public async assertDialogOpened(message: string): Promise<Return | this> {
    //     const actual = await this.site.waitForEvent('dialog').then((d) => d.message());
    //     return expects(
    //         message,
    //         actual,
    //         ({ expected, actual }) =>
    //             `Expected dialog message [${expected}] does not equal actual message [${actual}].`,
    //     ).then(this.self);
    // }

    public assertEnabled(field: string): Promise<this> {
        return this.resolveForField(field)
            .then(el => this.expectsEH((handle, expected) => !!handle.disabled === expected, el, false, `Expected element [${field}] to be enabled, but it wasn't.`))
            .then(this.self);
    }

    public assertDisabled(field: any): Promise<this> {
        return this.resolveForField(field)
            .then(element => expects(
                true,
                PuthStandardPlugin.its(element, 'disabled'),
                `Expected element [${field}] to be disabled, but it wasn't.`,
                isEqualTo,
            ))
            .then(this.self);
    }

    public assertButtonEnabled(button: any): Promise<this> {
        return this.resolveForButtonPress(button)
            .then(element => expects(
                false,
                PuthStandardPlugin.its(element, 'disabled'),
                `Expected button [${button}] to be enabled, but it wasn't.`,
                isEqualTo,
            ))
            .then(this.self);
    }

    public assertButtonDisabled(button: string): Promise<this> {
        return this.resolveForButtonPress(button)
            .then(element => expects(
                true,
                PuthStandardPlugin.its(element, 'disabled'),
                `Expected button [${button}] to be disabled, but it wasn't.`,
                isEqualTo,
            ))
            .then(this.self);
    }

    public assertFocused(field: string): Promise<this> {
        return this.resolveForField(field)
            .then(el => this.expectsEH((handle) => document?.activeElement === handle, el, null, `Expected element [${field}] to be focused, but it wasn't.`))
            .then(this.self);
    }

    public assertNotFocused(field: string): Promise<Return | this> {
        return this.resolveForField(field)
            .then(el => this.expectsEH((handle) => document?.activeElement !== handle, el, null, `Expected element [${field}] to be focused, but it wasn't.`))
            .then(this.self);
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
        return this.site.evaluate(script);
    }

    public resolver(selector: string[]|string) {
        if (Array.isArray(selector)) {
            return selector.map(s => this.resolver(s));
        }

        const original = selector;

        for (const [key, value] of Object.entries(this.resolverPageElements)) {
            selector = selector.replaceAll(key, value);
        }
        if (selector.startsWith('@') && selector === original) {
            selector = selector.replace(/@(\S+)/g, `[${this.resolverDuskSelectorHtmlAttribute}="$1"]`);
        }

        return (this.resolverPrefix + ' ' + selector).trim();
    }

    private expectsEH(evalFn, handle, expected , message) {
        return this.site.waitForFunction(evalFn, {timeout: this.timeout, polling: 'mutation'}, handle, expected)
            .catch(async error => {
                throw new ExpectationFailed(await resolveValue(message, { expected, actual: undefined }), expected, undefined);
            });
    }

    private createElementNotFoundMessage(selector: string[] | string) {
        return `Element [${Array.isArray(selector) ? selector.join(' | ') : selector}] not found.`;
    }

    public isPage() {
        return this.site instanceof Page;
    }
}
