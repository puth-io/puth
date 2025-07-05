import { Browser as PPTRBrowser, Dialog, ElementHandle, Frame, Page, TimeoutError, Viewport, WaitForOptions } from 'puppeteer-core';
import Context from '../Context';
import { getWindowBounds, maximize, move, setWindowBounds } from '../plugins/Std/PuthBrowserExtensions';
import { PuthStandardPlugin } from '../index';
import { type } from '../plugins/utils/cy';
import { Return } from '../context/Return';
import {clearTimeout} from 'node:timers';
import { retryFor } from '../Utils';

// TODO
// @gen-class ElementHandle
// interface ElementHandle {
//     children: () => ElementHandle[];
// }

export type integer = number;

const isEqualTo    = (actual: any, expected: any) => expected == actual;
const isNotEqualTo = (actual: any, expected: any) => expected != actual;
const isStartingWith   = (actual: any, expected: any) => actual.startsWith(expected);
const isEndingWith   = (actual: any, expected: any) => actual.endsWith(expected);
const isIncluding   = (actual: any, expected: any) => actual.includes(expected);

// "actual" only assertions
const isNull     = (actual: any, _: any) => actual == null;
const isNotNull  = (actual: any, _: any) => actual != null;
const isEmpty    = (actual: any, _: any) => actual == null || actual == '';
const isNotEmpty = (actual: any, _: any) => actual != null && actual != '';

export async function expects(
    actual: any,
    compareFn: (actual: any, expected: any) => boolean,
    expected: any,
    message: any,
): Promise<void> {
    if (compareFn == null) {
        compareFn = (e, a) => e == a;
    }
    actual = await resolveValue(actual);
    expected = await resolveValue(expected);

    if (!compareFn(actual, expected)) {
        throw new ExpectationFailed(await resolveValue(message, { actual, expected }), expected, actual);
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
    public readonly site: Page | Frame;

    private readonly self: () => this;
    private readonly selfWithMeta: (meta) => () => Return<this>;
    private readonly selfWithAsserts: (count?) => () => Return<this>;

    public fitOnFailure: boolean = true;

    // timeout in milliseconds for wait functions
    public timeout: integer = 3000;

    public resolverDuskSelectorHtmlAttribute: string = 'dusk';
    public resolverPrefix: string = 'body';
    public resolverPageElements: {} = {};

    private dialogTypeCache: string = '';

    constructor(context: Context, page: Page | Frame) {
        this.context = context;
        this.browser = page instanceof Page ? page.browser() : page.page().browser();
        this.site = page;

        this.self = (): this => this;
        this.selfWithMeta = (meta) => (): Return<this> => Return.Self().withMeta(meta) as Return<this>;
        this.selfWithAsserts = (count = 1) => this.selfWithMeta({assertions: count});
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

    public withinIframe(selector: string): Promise<Browser> {
        return this.firstOrFail(selector).then(async element => {
            let frame = await element.contentFrame();
            if (frame == null) {
                throw new ExpectationFailed(`Element [${selector} has no frame attached (is this an iframe?).]`);
            }

            return new Browser(this.context, frame);
        })
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

    public evaluate(pageFunction: string[]|string, args: any[] = []): Promise<any[]|any> {
        if (Array.isArray(pageFunction)) {
            return Promise.all(pageFunction.map((func, idx) => this.evaluate(func, args[idx] ?? [])));
        }

        return this.site.evaluate(pageFunction, ...args);
    }

    public quit(): Promise<void> {
        return this.context.destroyBrowserByBrowser(this.browser);
    }

    public url(): string {
        return this.site.url();
    }

    private _url(): URL {
        return new URL(this.site.url());
    }

    public scheme(): string {
        let url = this._url();
        return url.protocol.substring(0, url.protocol.length - 1);
    }

    public host(): string {
        return this._url().hostname;
    }

    public path(): string {
        return this._url().pathname;
    }

    public port(): string {
        let port = this._url().port;
        if (port === '') {
            let scheme = this.scheme();
            if (scheme === 'http') port = '80';
            else if (scheme === 'https') port = '443';
        }

        return port;
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

    public async value(selector: string, value: any = null): Promise<this|string> {
        return this.firstOrFail(selector)
            .then((element) => PuthStandardPlugin.value(element, value))
            .then(rv => value == null ? rv : this);
    }

    public text(selector: string): Promise<string> {
        return this.attribute(selector, 'innertext');
    }

    public attribute(selector: string, attribute: string): Promise<string> {
        return this.firstOrFail(selector).then((element) => PuthStandardPlugin.its(element, attribute));
    }

    public type(selector: string[] | string, value: string, options = {}): Promise<this> {
        return this.firstOrFail(this.resolver(selector))
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
    public findAll(selector: string[] | string, options: {} = {}): Promise<ElementHandle[]> {
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
    public findOrFail(selector: string[] | string, options: {} = {}): Promise<ElementHandle[]> {
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
    public firstOrFail(selector: string[] | string, options: {} = {}): Promise<ElementHandle> {
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
                this.expectsHandleFunction(
                    (handle, expected) => !!handle.disabled === expected,
                    element,
                    false,
                    `Expected element [${button}] to be enabled, but it wasn't.`,
                )
            ))
            .then(this.self);
    }


    //// ASSERTIONS ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Assert that the page title is the given value.
    public assertTitle(title: string): Promise<Return<this>> {
        return expects(
            this.site.title(),
            isEqualTo,
            title,
            ({ actual }) => `Expected title [${title}] does not equal actual title [${actual}].`,
        ).then(this.selfWithAsserts());
    }

    // Assert that the page title contains the given value.
    public assertTitleContains(title: string): Promise<Return<this>> {
        return expects(
            this.site.title(),
            (actual, expected) => actual.includes(expected),
            title,
            ({ expected, actual }) => `Did not see expected value [${expected}] within title [${actual}].`,
        ).then(this.selfWithAsserts());
    }

    public async assertHasCookie(name: string): Promise<Return<this>> {
        return expects(
            (await this.getCookieByName(name))?.value,
            isNotNull,
            undefined,
            `Did not find expected cookie [${name}].`,
        ).then(this.selfWithAsserts());
    }

    public async assertCookieMissing(name: string): Promise<Return<this>> {
        return expects(
            (await this.getCookieByName(name))?.value,
            isNull,
            undefined,
            `Found unexpected cookie [${name}].`,
        ).then(this.selfWithAsserts());
    }

    public async assertCookieValue(name: string, value: string): Promise<Return<this>> {
        return expects(
            (await this.getCookieByName(name))?.value?.value ?? '',
            isEqualTo,
            value,
            ({ expected, actual }) => `Cookie [${name}] had value [${actual?.value ?? ''}], but expected [${expected}].`,
        ).then(this.selfWithAsserts());
    }

    public assertSee(text: string, ignoreCase: boolean = false): Promise<Return<this>> {
        return this.assertSeeIn('', text, ignoreCase);
    }

    public assertDontSee(text: string, ignoreCase: boolean = false): Promise<Return<this>> {
        return this.assertDontSeeIn('', text, ignoreCase);
    }

    public assertSeeIn(selector: string, text: string, ignoreCase = false): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects(
                actual,
                (a, e) => (ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e)),
                text,
                ({ expected }) => `Did not see expected text [${expected}] within element [${selector}].`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertDontSeeIn(selector: string, text: string, ignoreCase = false): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects(
                actual,
                (a, e) => !(ignoreCase ? a.toLowerCase().includes(e.toLowerCase()) : a.includes(e)),
                text,
                ({ expected }) => `Saw unexpected text [${expected}] within element [${selector}].`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertSeeAnythingIn(selector: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects(actual, isNotEmpty, undefined, `Saw unexpected text [''] within element [${selector}].`))
            .then(this.selfWithAsserts());
    }

    public assertSeeNothingIn(selector: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then((element) => PuthStandardPlugin.its(element, 'innerText'))
            .then((actual) => expects(actual, isEmpty, undefined, `Did not see expected text [''] within element [${selector}].`))
            .then(this.selfWithAsserts());
    }

    public async assertScript(expression: string, expected: any = true): Promise<Return<this>> {
        return expects(
            this.site.evaluate(expression),
            isEqualTo,
            expected,
            `JavaScript expression [${expression}] mismatched.`,
        ).then(this.selfWithAsserts());
    }

    public assertSourceHas(code: string): Promise<Return<this>> {
        return expects(
            this.site.content(),
            (a, e) => a.includes(e),
            code,
            ({ expected }) => `Did not find expected source code [${expected}]`,
        ).then(this.selfWithAsserts());
    }

    public assertSourceMissing(code: string): Promise<Return<this>> {
        return expects(
            this.site.content(),
            (a, e) => !a.includes(e),
            code,
            ({ expected }) => `Found unexpected source code [${expected}]`,
        ).then(this.selfWithAsserts());
    }

    // Assert that the given link is present on the page
    public assertSeeLink(link: string, selector: string = 'a', options: {} = {}): Promise<Return<this>> {
        link = link.replace("'", "\\'");
        return this.assertVisible(`${selector}[href='${link}']`, options);
    }

    // Assert that the given link is not present on the page
    public assertDontSeeLink(link: string, selector: string = 'a', options: {} = {}): Promise<Return<this>> {
        link = link.replace("'", "\\'");
        return this.assertMissing(`${selector}[href='${link}']`, options);
    }

    public assertInputValue(field: any, value: string): Promise<Return<this>> {
        return this.resolveForTyping(field).then(element => expects(
            PuthStandardPlugin.its(element, 'value'),
            isEqualTo,
            value,
            ({ expected, actual }) => `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
        )).then(this.selfWithAsserts());
    }

    public assertInputValueIsNot(field: any, value: string): Promise<Return<this>> {
        return this.resolveForTyping(field).then(element => expects(
            PuthStandardPlugin.its(element, 'value'),
            isNotEqualTo,
            value,
            ({ expected, actual }) => `Expected value [${expected}] for the [${field}] input does not equal the actual value [${actual}].`,
        )).then(this.selfWithAsserts());
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

    public async assertInputPresent(field: string, timeout = 5): Promise<Return<this>> {
        return this.assertPresent(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
    }

    public async assertInputMissing(field: string, timeout = 5): Promise<Return<this>> {
        await this.assertMissing(`input[name='${field}'], textarea[name='${field}'], select[name='${field}']`, timeout);
        return this;
    }

    private _assertProperty(element: Promise<ElementHandle>, property, compareFn, expected, message) {
        return element.then(element => expects(PuthStandardPlugin.its(element, property), compareFn, expected, message)).then(this.selfWithAsserts());
    }

    public assertChecked(field: string, value: string|null = null): Promise<Return<this>> {
        return this._assertProperty(this.resolveForChecking(field, value), 'checked', isEqualTo, true, `Expected checkbox [${field}] to be checked, but it wasn't.`);
    }

    public assertNotChecked(field: string, value: string|null = null): Promise<Return<this>> {
        return this._assertProperty(this.resolveForChecking(field, value), 'checked', isEqualTo, false, `Checkbox [${field}] was unexpectedly checked.`);
    }

    public async assertIndeterminate(field: string, value: string | null = null): Promise<Return<this>> {
        return this.assertNotChecked(field, value)
            .then(_ => this.firstOrFail(this.resolver(field)))
            .then(async element => expects(
                (await PuthStandardPlugin.attr(element, 'indeterminate') || await PuthStandardPlugin.its(element, 'indeterminate')),
                isEqualTo,
                true,
                `Checkbox [${field}] was not in indeterminate state.`,
        )).then(this.selfWithAsserts());
    }

    public assertRadioSelected(field: string, value: string): Promise<Return<this>> {
        return this._assertProperty(this.resolveForRadioSelection(field, value), 'checked', isEqualTo, true, `Expected radio [${field}] to be selected, but it wasn't.`);
    }

    public assertRadioNotSelected(field: string, value: string | null = null): Promise<Return<this>> {
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

    public assertSelected(field: string, value: string[]|string): Promise<Return<this>> {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return expects(
            this.selected(field, value),
            isEqualTo,
            true,
            `Expected value [${value.join(',')}] to be selected for [${field}], but it wasn't.`,
        ).then(this.selfWithAsserts());
    }

    public assertNotSelected(field: string, value: string[]|string): Promise<Return<this>> {
        if (!Array.isArray(value)) {
            value = [value];
        }

        return expects(
            this.selected(field, value),
            isEqualTo,
            false,
            `Unexpected value [${value.join(',')}] selected for [${field}].`,
        ).then(this.selfWithAsserts());
    }

    public assertSelectHasOptions(field: string, values: string[]): Promise<Return<this>> {
        return this.resolveSelectOptions(field).then(selectable => expects(
            values.every(v => selectable.includes(v)),
            isEqualTo,
            true,
            `Expected options [${values.join(',')}] for selection field [${field}] to be available.`,
        )).then(this.selfWithAsserts());
    }

    public assertSelectMissingOptions(field: string, values: string[]): Promise<Return<this>> {
        return this.resolveSelectOptions(field).then(selectable => expects(
            selectable.some(s => values.includes(s)),
            isEqualTo,
            false,
            `Unexpected options [${values.join(',')}] for selection field [${field}].`,
        )).then(this.selfWithAsserts());
    }

    public assertSelectHasOption(field: string, value: string): Promise<Return<this>> {
        return this.assertSelectHasOptions(field, [value]);
    }

    public assertSelectMissingOption(field: string, value: string): Promise<Return<this>> {
        return this.assertSelectMissingOptions(field, [value]);
    }

    public assertValue(selector: string, value: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector)).then(el => expects(
            PuthStandardPlugin.its(el, 'value'),
            isEqualTo,
            value,
            `Did not see expected value [${value}] within element [${this.resolver(selector)}].`,
        )).then(this.selfWithAsserts());
    }

    public assertValueIsNot(selector: string, value: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector)).then(el => expects(
            PuthStandardPlugin.its(el, 'value'),
            isNotEqualTo,
            value,
            `Saw unexpected value [${value}] within element [${this.resolver(selector)}].`,
        )).then(this.selfWithAsserts());
    }

    // private ensureElementSupportsValueAttribute(element: any, fullSelector: string): void {
    //     const allowed = ['textarea', 'select', 'button', 'input', 'li', 'meter', 'option', 'param', 'progress'];
    //     if (!allowed.includes(element.tagName.toLowerCase())) {
    //         throw new Error(`This assertion cannot be used with the element [${fullSelector}].`);
    //     }
    // }

    public assertAttribute(selector: string, attribute: string, value: string): Promise<Return<this>> {
        let fullSelector = this.resolver(selector);
        return this.firstOrFail(fullSelector).then(el => expects(
            PuthStandardPlugin.attr(el, attribute),
            isEqualTo,
            value,
            `Did not see expected attribute [${attribute}] within element [${fullSelector}].`,
        )).then(this.selfWithAsserts());
    }

    public assertAttributeMissing(selector: string, attribute: string): Promise<Return<this>> {
        let fullSelector = this.resolver(selector);
        return this.firstOrFail(fullSelector).then(el => expects(
            PuthStandardPlugin.attr(el, attribute),
            isEqualTo,
            null,
            `Saw unexpected attribute [${attribute}] within element [${fullSelector}].`,
        )).then(this.selfWithAsserts());
    }

    public assertAttributeContains(selector: string, attribute: string, value: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then(this.eEHW(
                (element, expected, attribute) => element.getAttribute(attribute)?.includes(expected),
                value,
                async ({element}) => `Attribute '${attribute}' does not contain [${value}]. Full attribute value was [${await PuthStandardPlugin.attr(element, attribute)}].`,
                attribute,
            ))
            .then(this.selfWithAsserts());
    }

    public assertAttributeDoesntContain(selector: string, attribute: string, value: string): Promise<Return<this>> {
        return this.firstOrFail(this.resolver(selector))
            .then(this.eEHW(
                (element, expected, attribute) => !element.getAttribute(attribute)?.includes(expected),
                value,
                async ({element}) => `Attribute '${attribute}' contains [${value}]. Full attribute value was [${await PuthStandardPlugin.attr(element, attribute)}].`,
                attribute,
            ))
            .then(this.selfWithAsserts());
    }

    public assertAriaAttribute(selector: string, attribute: string, value: string): Promise<Return<this>> {
        return this.assertAttribute(selector, `aria-${attribute}`, value);
    }

    public assertDataAttribute(selector: string, attribute: string, value: string): Promise<Return<this>> {
        return this.assertAttribute(selector, `data-${attribute}`, value);
    }

    public async assertVisible(selector: string, options: {} = {}): Promise<Return<this>> {
        return this.waitFor(this.resolver(selector), { ...options, state: 'visible' })
            .then((element) => expects(element, isNotNull, undefined, `Element [${selector}] is not visible.`))
            .then(this.selfWithAsserts());
    }

    public async assertMissing(selector: string, options: {} = {}): Promise<Return<this>> {
        return this.waitFor(this.resolver(selector), { ...options, state: 'hidden' })
            .then((element) => expects(element, isNull, undefined, `Saw unexpected element [${selector}].`))
            .then(this.selfWithAsserts());
    }

    public async assertPresent(selector: string, options: {} = {}): Promise<Return<this>> {
        return this.waitFor(this.resolver(selector), options).then(this.selfWithAsserts());
    }

    public assertNotPresent(selector: string, options: {} = {}): Promise<Return<this>> {
        return this.waitForNotPresent(this.resolver(selector)).then(this.selfWithAsserts());
    }

    // public async assertDialogOpened(message: string): Promise<Return<this>> {
    //     const actual = await this.site.waitForEvent('dialog').then((d) => d.message());
    //     return expects(
    //         actual,
    //         message,
    //         ({ expected, actual }) => `Expected dialog message [${expected}] does not equal actual message [${actual}].`,
    //     ).then(this.selfWithAsserts());
    // }

    public assertEnabled(field: string): Promise<Return<this>> {
        return this.resolveForField(field)
            .then(el => this.expectsHandleFunction((handle, expected) => !!handle.disabled === expected, el, false, `Expected element [${field}] to be enabled, but it wasn't.`))
            .then(this.selfWithAsserts());
    }

    public assertDisabled(field: any): Promise<Return<this>> {
        return this.resolveForField(field)
            .then(element => expects(
                PuthStandardPlugin.its(element, 'disabled'),
                isEqualTo,
                true,
                `Expected element [${field}] to be disabled, but it wasn't.`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertButtonEnabled(button: any): Promise<Return<this>> {
        return this.resolveForButtonPress(button)
            .then(element => expects(
                PuthStandardPlugin.its(element, 'disabled'),
                isEqualTo,
                false,
                `Expected button [${button}] to be enabled, but it wasn't.`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertButtonDisabled(button: string): Promise<Return<this>> {
        return this.resolveForButtonPress(button)
            .then(element => expects(
                PuthStandardPlugin.its(element, 'disabled'),
                isEqualTo,
                true,
                `Expected button [${button}] to be disabled, but it wasn't.`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertFocused(field: string): Promise<Return<this>> {
        return this.resolveForField(field)
            .then(this.eEHW(
                element => document?.activeElement === element,
                null,
                `Expected element [${field}] to be focused, but it wasn't.`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertNotFocused(field: string): Promise<Return<this>> {
        return this.resolveForField(field)
            .then(this.eEHW(
                element => document?.activeElement !== element,
                null,
                `Expected element [${field}] not to be focused, but it was.`,
            ))
            .then(this.selfWithAsserts());
    }

    public assertVue(key: string, value: any, componentSelector: string | null = null): Promise<Return<this>> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(actual, isEqualTo, value, `Vue attribute for key [${key}] mismatched.`).then(this.selfWithAsserts());
    }

    public assertVueIsNot(key: string, value: any, componentSelector: string | null = null): Promise<Return<this>> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(
            actual,
            isNotEqualTo,
            value,
            `Vue attribute for key [${key}] should not equal [${value}].`,
        ).then(this.selfWithAsserts());
    }

    public assertVueContains(key: string, value: any, componentSelector: string | null = null): Promise<Return<this>> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(
            actual,
            (a, e) => Array.isArray(a) && a.includes(e),
            value,
            () => `The attribute for key [${key}] is not an array that contains [${value}].`,
        ).then(this.selfWithAsserts());
    }

    public assertVueDoesntContain(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return<this>> {
        return this.assertVueDoesNotContain(key, value, componentSelector);
    }

    public assertVueDoesNotContain(
        key: string,
        value: any,
        componentSelector: string | null = null,
    ): Promise<Return<this>> {
        const actual = () => this.vueAttribute(componentSelector, key);
        return expects(
            actual,
            (a, e) => Array.isArray(a) && !a.includes(e),
            value,
            () => `Vue attribute for key [${key}] should not contain [${value}].`,
        ).then(this.selfWithAsserts());
    }

    public vueAttribute(componentSelector: string | null, key: string): any {
        const fullSelector = this.resolver(componentSelector);
        const script = `JSON.parse(JSON.stringify((function() {
            const el = document.querySelector('${fullSelector}');
            if (!el) return undefined;
            if (typeof el.__vue__ !== 'undefined') return el.__vue__.${key};
            try {
              const attr = el.__vueParentComponent.ctx.${key};
              if (typeof attr !== 'undefined') return attr;
            } catch (_) {}
            return el.__vueParentComponent.setupState.${key} ?? null;
        })()));`;
        return this.site.evaluate(script);
    }

    // Assert that the current URL (without the query string) matches the given string.
    public assertUrlIs(url: string, options: {} = {}): Promise<Return<this>> {
        return this.eW(
            options,
            (u) => {
                let _url = new URL(window.location.href);
                let url = (_url.protocol === 'about:') ?
                    (_url.protocol + _url.pathname)
                    : `${_url.protocol}//${_url.hostname}${_url.port ? (':' + _url.port) : ''}${_url.pathname}`;

                return (new RegExp('^' + u.replace(/\*/g, '.*') + '$')).test(url);
            },
            url,
        ).catch(error => {
            let actual = this.url();
            throw new ExpectationFailed(`Actual URL [${actual}] does not equal expected URL [${url}].`, url, actual);
        })
        .then(this.selfWithAsserts());
    }

    public _assertLocationProperty(property: string, expected: string, matches: boolean = true, trimEnd: integer = 0) {
        return this.eW(
            {},
            (u, m, p, te) => (new RegExp('^' + u.replace(/\*/g, '.*') + '$')).test(window.location[p].substring(0, window.location[p].length - te)) === m,
            expected,
            matches,
            property,
            trimEnd,
        );
    }

    private _assertSchemeIs(scheme: string, matches: boolean = true): Promise<Return<this>> {
        return this._assertLocationProperty('protocol', scheme, matches, 1)
            .catch(error => {
                throw new ExpectationFailed(matches ?
                    `Actual scheme [${this.scheme()}] does not equal expected scheme [${scheme}].`
                    : `Scheme [${scheme}] should not equal the actual value.`, scheme, this.scheme())}
            )
            .then(this.selfWithAsserts());
    }

    // Assert that the current scheme matches the given scheme.
    public assertSchemeIs(scheme: string): Promise<Return<this>> {
        return this._assertSchemeIs(scheme);
    }

    // Assert that the current scheme does not match the given scheme.
    public assertSchemeIsNot(scheme: string): Promise<Return<this>> {
        return this._assertSchemeIs(scheme, false);
    }

    private _assertPathIs(path: string, matches: boolean = true): Promise<Return<this>> {
        return this._assertLocationProperty('pathname', path, matches)
            .catch(error => {
                throw new ExpectationFailed(matches ?
                    `Actual path [${this.path()}] does not equal expected path [${path}].`
                    : `Path [${path}] should not equal the actual value.`, path, this.path())}
            )
            .then(this.selfWithAsserts());
    }

    // Assert that the current URL path matches the given pattern.
    public assertPathIs(scheme: string): Promise<Return<this>> {
        return this._assertPathIs(scheme);
    }

    // Assert that the current URL path does not match the given path.
    public assertPathIsNot(scheme: string): Promise<Return<this>> {
        return this._assertPathIs(scheme, false);
    }

    // Assert that the current host matches the given host.
    public assertHostIs(host: string): Promise<Return<this>> {
        return expects(this.host(), isEqualTo, host, `Actual host [${this.host()}] does not equal expected host [${host}].`).then(this.selfWithAsserts());
    }

    // Assert that the current host does not match the given host.
    public assertHostIsNot(host: string): Promise<Return<this>> {
        return expects(this.host(), isNotEqualTo, host, `Host [${host}] should not equal the actual value.`).then(this.selfWithAsserts());
    }

    // Assert that the current port matches the given port.
    public assertPortIs(port: string): Promise<Return<this>> {
        return expects(this.port(), isEqualTo, port, `Actual host [${this.port()}] does not equal expected port [${port}].`).then(this.selfWithAsserts());
    }

    // Assert that the current host does not match the given host.
    public assertPortIsNot(port: string): Promise<Return<this>> {
        return expects(this.port(), isNotEqualTo, port, `Port [${port}] should not equal the actual value.`).then(this.selfWithAsserts());
    }

    // Assert that the current URL path begins with given path.
    public assertPathBeginsWith(path: string): Promise<Return<this>> {
        return expects(this.path(), isStartingWith, path, `Actual path [${this.path()}] does not begin with expected path [${path}].`).then(this.selfWithAsserts());
    }

    // Assert that the current URL path ends with the given path.
    public assertPathEndsWith(path: string): Promise<Return<this>> {
        return expects(this.path(), isEndingWith, path, `Actual path [${this.path()}] does not end with expected path [${path}].`).then(this.selfWithAsserts());
    }

    // Assert that the current URL path contains the given path.
    public assertPathContains(path: string): Promise<Return<this>> {
        return expects(this.path(), isIncluding, path, `Actual path [${this.path()}] does not contain the expected string [${path}].`).then(this.selfWithAsserts());
    }

    private _assertHasQueryStringParameter(name: string, matches: boolean = true) {
        return this.eW({}, (n, m) => ((new URLSearchParams(window.location.search)).has(n)) === m, name, matches)
            .catch(_ => {throw new ExpectationFailed(matches ?
                `Did not see expected query string parameter [${name}] in [${this.url()}]`
                : `Found unexpected query string parameter [${name}] in [${this.url()}]`
            )});
    }

    public _assertQueryStringParameter(name: string, value: string|null = null, matches: boolean = true) {
        return this._assertHasQueryStringParameter(name, matches).then(_ => this.eW(
            {},
            (q, v, m) => {
                let search = new URLSearchParams(window.location.search);
                if (!search.has(q) === m) {
                    return false;
                }
                if (v == null) {
                    return true;
                }

                return (search.get(q) === v) === m;
            },
            name,
            value,
            matches,
        ));
    }

    public assertQueryStringHas(name: string, value: string|null = null): Promise<Return<this>> {
        if (value == null) {
            return this._assertHasQueryStringParameter(name).then(this.selfWithAsserts());
        }

        return this._assertQueryStringParameter(name, value)
            .catch(error => {
                if (!(error instanceof ExpectationFailed)) {
                    throw new ExpectationFailed(`Query string parameter [${name}] had value [${this._url().searchParams.get(name)}], but expected [${value}].`);
                }
                throw error;
            })
            .then(this.selfWithAsserts());
    }

    public assertQueryStringMissing(name: string): Promise<Return<this>> {
        return this._assertHasQueryStringParameter(name, false).then(this.selfWithAsserts());
    }

    // Assert that the current URL fragment matches the given pattern.
    public assertFragmentIs(fragment: string): Promise<Return<this>> {
        return this.eW(
            {},
            f => (new RegExp('^' + f.replace(/\*/g, '.*') + '$')).test(window.location.hash.substring(1, window.location.hash.length)),
            fragment,
        )
            .catch(_ => {throw new ExpectationFailed(`Actual fragment [${this._url().hash.substring(1, this._url().hash.length)}] does not equal expected fragment [${fragment}].`)})
            .then(this.selfWithAsserts());
    }

    // Assert that the current URL fragment begins with given fragment.
    public assertFragmentBeginsWith(fragment: string): Promise<Return<this>> {
        return this.eW({}, f => window.location.hash.substring(1, window.location.hash.length).startsWith(f), fragment)
            .catch(_ => {throw new ExpectationFailed(`Actual fragment [${this._url().hash.substring(1, this._url().hash.length)}] does not begin with expected fragment [${fragment}].`)})
            .then(this.selfWithAsserts());
    }

    // Assert that the current URL fragment does not match the given fragment.
    public assertFragmentIsNot(fragment: string): Promise<Return<this>> {
        return this.eW({}, f => window.location.hash.substring(1, window.location.hash.length) != f, fragment)
            .catch(_ => {throw new ExpectationFailed(`Actual fragment [${this._url().hash.substring(1, this._url().hash.length)}] does not begin with expected fragment [${fragment}].`)})
            .then(this.selfWithAsserts());
    }

    public resolver(selector: string[]|string|null) {
        if (Array.isArray(selector)) {
            return selector.map(s => this.resolver(s));
        }
        if (selector == null) {
            selector = '';
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

    private _waitForDialog(): Promise<Dialog> {
        if (this.context.isPageBlockedByDialog(this.site)) {
            return Promise.resolve(this.context.caches.dialog.get(this.site));
        }
        // TODO return retryFor()
    }

    public waitForDialog(): Promise<this> {
        return this._waitForDialog().then(this.self);
    }

    public assertDialogOpened(message: string): Promise<Return<this>> {
        return this._waitForDialog().then(dialog => expects(
            dialog.message(),
            isEqualTo,
            message,
            `Expected dialog message [${message}] does not equal actual message [${dialog.message()}].`,
        )).then(this.selfWithAsserts());
    }

    public typeInDialog(value: string): Promise<this> {
        return this._waitForDialog().then(dialog => {
            this.dialogTypeCache += value;
        }).then(this.self);
    }

    public acceptDialog(value: string|null = null): Promise<this> {
        return this._waitForDialog()
            .then(dialog => dialog.accept(value ?? this.dialogTypeCache ?? undefined))
            .finally(() => {
                this.dialogTypeCache = '';
                this.context.caches.dialog.delete(this.site);
            })
            .then(this.self);
    }

    public dismissDialog(): Promise<this> {
        return this._waitForDialog()
            .then(dialog => dialog.dismiss())
            .finally(() => {
                this.dialogTypeCache = '';
                this.context.caches.dialog.delete(this.site);
            })
            .then(this.self);
    }

    private _dialog(): Dialog {
        if (!this.context.isPageBlockedByDialog(this.site)) {
            throw new ExpectationFailed('Expected page to have an open dialog but non was found.')
        }

        let dialog = this.context.caches.dialog.get(this.site);
        if (dialog == null) {
            throw new ExpectationFailed('Expected page to have an open dialog but non was found.');
        }

        return dialog;
    }

    private expectsHandleFunction(evalFn, handle, expected , message, ...args) {
        return this.site.waitForFunction(evalFn, {timeout: this.timeout, polling: 'mutation'}, handle, expected, ...args)
            .catch(async error => {
                throw new ExpectationFailed(await resolveValue(message, { expected, actual: undefined, element: handle }), expected, undefined);
            });
    }

    private eEHW(evalFn, expected , message, ...args) {
        return handle => this.expectsHandleFunction(evalFn, handle, expected, message, ...args);
    }

    private eW(options, evalFn, ...args) {
        return this.site.waitForFunction(evalFn, {polling: 'mutation', ...options, timeout: options?.timeout ?? this.timeout}, ...args);
    }

    private createElementNotFoundMessage(selector: string[] | string) {
        return `Element [${Array.isArray(selector) ? selector.join(' | ') : selector}] not found.`;
    }

    public isPage() {
        return this.site instanceof Page;
    }
}
