import PuthContextPlugin from '../PuthContextPlugin';
import Expects from '../Expects';
import { Assertion, PuthAssert } from '../PuthAssert';
import { retryFor } from '../Utils';
import { ElementHandle, Page } from 'puppeteer-core';
import { Return } from '../context/Return';
import Constructors from '../context/Constructors';
import {SpecialKeysMap, type} from './utils/cy';
import {bounds, maximize, move} from './Std/PuthBrowserExtensions';

export class PuthStandardPlugin extends PuthContextPlugin {
    constructor() {
        super();

        this.register({
            global: {
                $: {
                    func: this.$,
                    expects: Expects.Element,
                },
                parent: {
                    func: this.parent,
                    expects: Expects.Element,
                },
                should: this.should,
            },
            // resolver: {
            //     Page: {}
            // },
            Context: {
                assertStrictEqual: {
                    func: (puth, expected, actual) => PuthAssert.strictEqual(expected, actual),
                },
            },
            [Constructors.Browser]: {
                pages: async (browser, index?) => {
                    let pages = browser.pages();
                    return index != null ? (await pages)[index] : pages;
                },
                maximize,
                move,
                bounds,
            },
            [Constructors.Frame]: {
                get: this.get,
                contains: {
                    func: this.contains,
                    expects: Expects.Array,
                },
                visit: (page, url) => page.goto(url),
            },
            [Constructors.Page]: {
                get: this.get,
                contains: {
                    func: this.contains,
                    expects: Expects.Array,
                },
                visit: (page, url) => page.goto(url),
                visible: PuthStandardPlugin.visible,
                blur: this.blur,
                // @ts-ignore
                scrollTo: (el, ...options) => el.evaluate((o) => window.scrollTo(...o), options),
                window: (page) => page.evaluateHandle('window'),
                document: (page) => page.evaluateHandle('document'),
                focused: (el) => el.evaluateHandle('document.activeElement'),
                prefersReducedMotion: async (el, value = 'reduce') => {
                    await el.emulateMediaFeatures([
                        {
                            name: 'prefers-reduced-motion',
                            value,
                        },
                    ]);
                    return true;
                },
                // _dialog: (page, action, text) => this.context.tracked.dialogs.set(page, [action, text]),
                url: this.url,
                getCookieByName: PuthStandardPlugin.getCookieByName,
                waitForDialog: this.waitForDialog,
                acceptDialog: this.acceptDialog,
                dismissDialog: this.dismissDialog,
                type: async (page, selector, chars, options = {}) => await type(await page.$(selector), chars, options),
                // acceptNextDialog(message)
                // acceptAllDialogs(message)
                // dismissNextDialog(message)
                // dismissAllDialogs(message)
            },
            [Constructors.ElementHandle]: {
                get: this.get,
                contains: {
                    func: this.contains,
                    expects: Expects.Array,
                },
                its: PuthStandardPlugin.its,
                clickAndWait: this.clickAndWait,
                clickAndFile: this.clickAndFile,
                visible: PuthStandardPlugin.visible,
                children: PuthStandardPlugin.children,
                siblings: this.siblings,
                parents: this.parents,
                prev: this.prev,
                next: this.next,
                blur: this.blur,
                clear: PuthStandardPlugin.clear,
                submit: this.submit,
                value: PuthStandardPlugin.value,
                click: this.click,
                type: type,
                doubleClick: (el, options) => el.click({ ...options, clickCount: 2 }),
                leftClick: (el, options) => el.click(options),
                middleClick: (el, options) => el.click({ ...options, button: 'middle' }),
                rightClick: (el, options) => el.click({ ...options, button: 'right' }),
                selected: PuthStandardPlugin.selected,
                scrollIntoView: this.scrollIntoView,
                // @ts-ignore
                scrollTo: (el, ...options) =>
                    el.evaluate((e, o) => (e.tagName === 'BODY' ? window.scrollTo(...o) : e.scrollTo(...o)), options),
                innerText: async (el) => (await el.getProperty('innerText')).jsonValue(),
                innerHTML: async (el) => (await el.getProperty('innerHTML')).jsonValue(),
                evaluate: async (el, func) => {
                    if (typeof func === 'string') {
                        // tslint:disable-next-line:no-eval
                        func = eval(func);
                    }

                    return el.evaluate(func);
                },
                evaluateHandle: async (el, func) => {
                    if (typeof func === 'string') {
                        // tslint:disable-next-line:no-eval
                        func = eval(func);
                    }

                    return el.evaluateHandle(func);
                },
                getEventListeners: async (el) => {
                    let t = await el._client.send('DOMDebugger.getEventListeners', {
                        objectId: el._remoteObject.objectId,
                    });

                    return t?.listeners;
                },
                tagName: async (el) => (await el.evaluateHandle((handle) => handle.tagName)).jsonValue(),
                dragToOffset: this.dragToOffset,
            },
            Dialog: {
                accept: this.dialogAccept,
                dismiss: this.dialogDismiss,
            },
            [Constructors.Keyboard]: {
                press: (el, key, ...params) => el.press(SpecialKeysMap[key.toLowerCase()] ?? key, ...params),
                down: (el, key, ...params) => el.down(SpecialKeysMap[key.toLowerCase()] ?? key, ...params),
                up: (el, key, ...params) => el.up(SpecialKeysMap[key.toLowerCase()] ?? key, ...params),
                sendCharacter: (el, key, ...params) =>
                    el.sendCharacter(SpecialKeysMap[key.toLowerCase()] ?? key, ...params),
                // TODO keyboard function type use special type function
            },
        });
    }

    public static selected(element) {
        return element.evaluate((s) => [...s.options].filter((o) => o.selected).map((o) => o.value));
    }

    static async innerText(element) {
        return (await element.getProperty('innerText')).jsonValue();
    }

    static async innerHTML(element) {
        return (await element.getProperty('innerHTML')).jsonValue();
    }

    static async value(element, value = null) {
        if (value == null) {
            return (await element.getProperty('value')).jsonValue();
        }

        await element.evaluateHandle((handle, _value) => (handle.value = _value), value);
    }

    static async its(element, property) {
        if (property.toLowerCase() === 'innertext') {
            return await PuthStandardPlugin.innerText(element);
        }
        if (property.toLowerCase() === 'innerhtml') {
            return await PuthStandardPlugin.innerHTML(element);
        }
        if (property.toLowerCase() === 'value') {
            return await PuthStandardPlugin.value(element);
        }

        return (await element.getProperty(property)).jsonValue();
    }

    static async attr(element, attribute) {
        return (await element.evaluateHandle((el, p) => el.getAttribute(p), attribute)).jsonValue();
    }

    get(element, search, options?) {
        return retryFor(
            this.context.getTimeout(options),
            async (_) => await element.$(search),
            (v) => v !== null,
        );
    }

    contains(element, tag, search?, options?) {
        if (typeof search !== 'string') {
            options = search;
            search = undefined;
        }

        if (search === undefined) {
            search = tag;
            tag = '*';
        }

        let resolver = options?.exact ? 'text()' : '.';

        return retryFor(
            this.context.getTimeout(options),
            async () =>
                (await element.$$(`xpath/descendant-or-self::${tag}[contains(${resolver}, "${search}")]`)).reverse(),
            options?.negate ? (v) => v.length === 0 : (v) => v.length > 0,
        );
    }

    async $(element, selector, options?) {
        return retryFor(
            this.context.getTimeout(options),
            async (_) => await element.$(selector),
            (v) => v !== null,
        );
    }

    async parent(element) {
        let result = await element.$$('xpath/.//parent::*');
        return result.length === 0 ? undefined : result[0];
    }

    async parents(element) {
        return element.$$('xpath/.//ancestor::*');
    }

    static async children(element, selector) {
        if (selector) {
            return await element.$$(selector);
        }
        return await element.$$('xpath/.//child::*');
    }

    async siblings(element) {
        return await element.$$('xpath/.//preceding-sibling::* | .//following-sibling::*');
    }

    async prev(element) {
        let prev = await element.$$('xpath/.//preceding-sibling::*[1]');

        if (prev.length === 0) {
            // throw error
        }

        return prev[0];
    }

    async next(element) {
        let next = await element.$$('xpath/.//following-sibling::*[1]');

        if (next.length === 0) {
            // throw error
        }

        return next;
    }

    async blur(element, selector?) {
        if (selector) {
            element = await element.$(selector);
        }

        return await element.evaluate((e) => e.blur());
    }

    static async clear(element: ElementHandle) {
        await element.click({ count: 3 });
        await element.frame.page().keyboard.press('Backspace');
    }

    async submit(element, selector) {
        if (selector) {
            element = await element.$(selector);
        }

        await element.evaluate((form) => form.submit());
    }

    async clickAndWait(element, options, waitOptions) {
        await Promise.all([element?.frame.page().waitForNavigation(waitOptions), element.click(options)]);
    }

    async clickAndFile(element, options, waitOptions) {
        return await Promise.all([element?.frame.page().waitForFileChooser(waitOptions), element.click(options)]);
    }

    static async visible(element, selector?) {
        if (typeof selector === 'string') {
            element = await element.$(selector);
        } else if (selector) {
            element = selector;
        }
        if (!element) {
            return false;
        }

        let box = await element.boundingBox();
        return box.width > 0 && box.height > 0;
    }

    Assertions = {
        have: {
            text: {
                resolve: (element) => PuthStandardPlugin.its(element, 'innerText'),
                msg: (actual, expected) => `Expected '${actual}' to be '${expected}'`,
                test: (actual, expected) => actual === expected,
            },
            id: {
                resolve: (element) => PuthStandardPlugin.its(element, 'id'),
                msg: (actual, expected) => `Expected '${actual}' to have id '${expected}'`,
                test: (actual, expected) => actual === expected,
            },
            class: {
                resolve: (element) => PuthStandardPlugin.its(element, 'class'),
                msg: (actual, expected) => `Expected element to have class '${expected}' but found '${actual}'`,
                test: (actual, expected) => actual.split(' ').includes(expected),
            },
            attr: {
                resolve: (element, attribute) => PuthStandardPlugin.its(element, attribute),
                msg: (actual, expected) => `Expected element to have attribute '${expected}' but found '${actual}'`,
                test: (actual, expected) => actual === expected,
            },
            value: {
                resolve: (element) => PuthStandardPlugin.its(element, 'value'),
                msg: (actual, expected) => `Expected '${actual}' to be '${expected}'`,
                test: (actual, expected) => actual === expected,
            },
        },
    };

    async should(element, assertion, ...params) {
        let split = assertion.split('.');

        if (params.length === 0) {
            throw Error('No expected value provided!');
        }

        let expected = params[params.length - 1];

        if (split.length < 2) {
            throw Error('Bad assertion.');
        }

        let invertTest = false;
        let chainer = split[0];
        let func = split[1];

        if (split.length === 3 && split[0] === 'not') {
            invertTest = split[0] === 'not';
            chainer = split[1];
            func = split[2];
        }

        let assert = this.Assertions[chainer]?.[func];

        if (!assert) {
            throw Error(`Assertion "${assertion}" not found!`);
        }

        let actual = await assert.resolve(element, ...params.slice(0, params.length));
        let message = await assert.msg(actual, expected, ...params.slice(0, params.length));
        let test = await assert.test(actual, expected, ...params.slice(0, params.length));

        if (invertTest) {
            test = !test;
        }

        return Assertion(assertion, actual, expected, test, message);
    }

    url(element, options?) {
        return retryFor(this.context.getTimeout(options), async () => await element.url(), Expects.NotNull.test);
    }

    static async getCookieByName(page: Page, name, options?) {
        let cookies = await page.cookies();

        for (let idx in cookies) {
            if (cookies[idx].name === name) {
                return Return.Value(cookies[idx]);
            }
        }

        return Return.Null();
    }

    waitForDialog(page, options: any = {}) {
        return retryFor(
            options.timeout ?? 5000,
            () => this.context.caches.dialog.get(page),
            (rv) => rv !== undefined,
        );
    }

    scrollIntoView(elementHandle) {
        return elementHandle.evaluateHandle((handle) => handle.scrollIntoViewIfNeeded(true));
    }

    click(elementHandle, options: any = {}) {
        return elementHandle.click(options);
    }

    acceptDialog(page, message = '', options = {}) {
        return this.waitForDialog(page, options).then((dialog) => this.dialogAccept(dialog, message));
    }

    private dialogAccept(dialog, message = '') {
        return dialog.accept(message).finally(() =>
            this.context.caches.dialog.forEach((value, key) => {
                if (value === dialog) {
                    this.context.caches.dialog.delete(key);
                }
            }),
        );
    }

    dismissDialog(page, options = {}) {
        return this.waitForDialog(page, options).then((dialog) => this.dialogDismiss(dialog));
    }

    private dialogDismiss(dialog) {
        return dialog.dismiss().finally(() =>
            this.context.caches.dialog.forEach((value, key) => {
                if (value === dialog) {
                    this.context.caches.dialog.delete(key);
                }
            }),
        );
    }

    async dragToOffset(elementHandle, point, options = {}) {
        await this.scrollIntoView(elementHandle);

        const startPoint = await elementHandle.clickablePoint();
        const targetPoint = {
            x: startPoint.x + point.x,
            y: startPoint.y + point.y,
        };

        await elementHandle.frame.page().mouse.dragAndDrop(startPoint, targetPoint);

        return Return.Undefined();
    }
}
