import PuthContextPlugin from '../PuthContextPlugin';
import Expects from '../Expects';
import { Assertion, PuthAssert } from '../PuthAssert';
import { capitalizeFirstLetter, retryFor } from '../Utils';
import { ElementHandle } from 'puppeteer';
import Return from '../Context/Return';
import Constructors from '../Context/Constructors';

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
        visible: this.visible,
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
        // _dialog: (page, action, text) => this.getContext().tracked.dialogs.set(page, [action, text]),
        url: this.url,
        getCookieByName: this.getCookieByName,
        waitForDialog: this.waitForDialog,
        clickNoBlockDialog: this.clickNoBlockDialog,
        acceptDialog: this.acceptDialog,
        dismissDialog: this.dismissDialog,
        type: async (page, selector, chars, options = {}) => await this.type(await page.$(selector), chars, options),
      },
      [Constructors.ElementHandle]: {
        get: this.get,
        contains: {
          func: this.contains,
          expects: Expects.Array,
        },
        its: this.its,
        clickAndWait: this.clickAndWait,
        clickAndFile: this.clickAndFile,
        visible: this.visible,
        children: this.children,
        siblings: this.siblings,
        parents: this.parents,
        prev: this.prev,
        next: this.next,
        blur: this.blur,
        clear: this.clear,
        submit: this.submit,
        value: this.value,
        click: this.click,
        type: this.type,
        doubleClick: (el, options) => el.click({ ...options, clickCount: 2 }),
        leftClick: (el, options) => el.click(options),
        middleClick: (el, options) => el.click({ ...options, button: 'middle' }),
        rightClick: (el, options) => el.click({ ...options, button: 'right' }),
        selected: (el) => el.evaluate((s) => [...s.options].filter((o) => o.selected).map((o) => o.value)),
        scrollIntoView: this.scrollIntoView,
        // @ts-ignore
        scrollTo: (el, ...options) =>
          el.evaluate((e, o) => (e.tagName === 'BODY' ? window.scrollTo(...o) : e.scrollTo(...o)), options),
        innerText: async (el) => (await el.getProperty('innerText')).jsonValue(),
        innerHTML: async (el) => (await el.getProperty('innerHTML')).jsonValue(),
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
    });
  }

  KeyMapping = {
    leftarrow: 'ArrowLeft',
    rightarrow: 'ArrowRight',
    uparrow: 'ArrowUp',
    downarrow: 'ArrowDown',
    del: 'Delete',
    option: 'Alt',
    command: 'Meta',
    cmd: 'Meta',
    ctrl: 'Control',
    selectall: async (element, options) => {
      let page = element.frame.page();

      await page.keyboard.down('Control');
      await page.keyboard.press('A', options);
      if (options?.delay) {
        await page.waitForTimeout(options?.delay);
      }
      await page.keyboard.up('Control');
    },
    // TODO moveToStart
    // TODO moveToEnd
  };

  /**
   * https://github.com/puppeteer/puppeteer/blob/main/src/common/USKeyboardLayout.ts
   *
   * @param element
   * @param chars
   * @param options
   */
  async type(element, chars, options: { delay? } = {}) {
    let split = chars.split(/({.+?})/).filter((i) => !!i);
    let release: string[] = [];

    for (let chs of split) {
      let specialKey = /{(.+?)}/.exec(chs);

      if (specialKey) {
        let key = this.KeyMapping[specialKey[1].toLowerCase()] ?? capitalizeFirstLetter(specialKey[1]);

        if (typeof key === 'function') {
          await key(element, options);
        } else {
          await element.frame.page().keyboard.down(key);
          release.push(key);
        }
      } else {
        await element.type(chs, options);
      }
    }

    await Promise.all(
      release.map(async (key) => {
        if (options?.delay) {
          await element.frame.page().waitForTimeout(options?.delay);
        }
        await element.frame.page().keyboard.up(key);
      }),
    );
  }

  async innerText(element) {
    return (await element.getProperty('innerText')).jsonValue();
  }

  async innerHTML(element) {
    return (await element.getProperty('innerHTML')).jsonValue();
  }

  async value(element, val = null) {
    if (val == null) {
      return (await element.getProperty('value')).jsonValue();
    }

    await element.evaluateHandle((handle, innerVal) => (handle.value = innerVal), val);
  }

  async its(element, property) {
    if (property.toLowerCase() === 'innertext') {
      return await this.innerText(element);
    }

    if (property.toLowerCase() === 'innerhtml') {
      return await this.innerHTML(element);
    }

    if (property.toLowerCase() === 'value') {
      return await this.value(element);
    }

    return (await element.evaluateHandle((el, p) => el.getAttribute(p), property)).jsonValue();
  }

  get(element, search, options?) {
    return retryFor(
      this.getContext().getTimeout(options),
      async (_) => await element.$(search),
      (v) => v !== null,
    );
  }

  contains(element, search, options?) {
    return retryFor(
      this.getContext().getTimeout(options),
      () => element.$x("//text()[contains(., '" + search + "')]"),
      (v) => v.length > 0,
    );
  }

  async $(element, selector, options?) {
    return retryFor(
      this.getContext().getTimeout(options),
      async (_) => await element.$(selector),
      (v) => v !== null,
    );
  }

  async parent(element) {
    let result = await element.$x('.//parent::*');
    return result.length === 0 ? undefined : result[0];
  }

  async parents(element) {
    return element.$x('.//ancestor::*');
  }

  async children(element, selector) {
    if (selector) {
      return await element.$$(selector);
    }
    return await element.$x('.//child::*');
  }

  async siblings(element) {
    return await element.$x('.//preceding-sibling::* | .//following-sibling::*');
  }

  async prev(element) {
    let prev = await element.$x('.//preceding-sibling::*[1]');

    if (prev.length === 0) {
      // throw error
    }

    return prev[0];
  }

  async next(element) {
    let next = await element.$x('.//following-sibling::*[1]');

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

  async clear(element: ElementHandle) {
    await element.click({ clickCount: 3 });
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

  async visible(element, selector?) {
    if (typeof selector === 'string') {
      element = await element.$(selector);
    } else if (selector) {
      element = selector;
    }

    // This has to be after the above if else cases
    // in case selected element is null
    if (!element) {
      return false;
    }

    let box = await element.boundingBox();
    return box.width > 0 && box.height > 0;
  }

  Assertions = {
    have: {
      text: {
        resolve: (element) => this.its(element, 'innerText'),
        msg: (actual, expected) => `Expected '${actual}' to be '${expected}'`,
        test: (actual, expected) => actual === expected,
      },
      id: {
        resolve: (element) => this.its(element, 'id'),
        msg: (actual, expected) => `Expected '${actual}' to have id '${expected}'`,
        test: (actual, expected) => actual === expected,
      },
      class: {
        resolve: (element) => this.its(element, 'class'),
        msg: (actual, expected) => `Expected element to have class '${expected}' but found '${actual}'`,
        test: (actual, expected) => actual.split(' ').includes(expected),
      },
      attr: {
        resolve: (element, attribute) => this.its(element, attribute),
        msg: (actual, expected) => `Expected element to have attribute '${expected}' but found '${actual}'`,
        test: (actual, expected) => actual === expected,
      },
      value: {
        resolve: (element) => this.its(element, 'value'),
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
    return retryFor(this.getContext().getTimeout(options), async () => await element.url(), Expects.NotNull.test);
  }

  async getCookieByName(page, name, options?) {
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
      () => this.getContext().caches.dialog.get(page),
      (rv) => rv !== undefined,
    );
  }

  scrollIntoView(elementHandle) {
    return elementHandle.evaluateHandle((handle) => handle.scrollIntoViewIfNeeded(true));
  }

  click(elementHandle, options: any = {}) {
    if (options?.unblockOnDialogOpen) {
      return this.clickNoBlockDialog(elementHandle.frame.page(), elementHandle, options);
    }

    return elementHandle.click(options);
  }

  async clickNoBlockDialog(page, selectorOrElement, options: any = {}) {
    if (!(selectorOrElement instanceof ElementHandle)) {
      selectorOrElement = await page.$(selectorOrElement);
    }

    return await this.scrollIntoView(selectorOrElement)
      .then(() => selectorOrElement.clickablePoint(options.offset))
      .then(async ({ x, y }) => {
        const mouse = page.mouse;

        await mouse.move(x, y);
        await mouse.down(options);

        return mouse;
      })
      .then(async (mouse) => {
        if (options.delay) {
          await new Promise((f) => {
            return setTimeout(f, options.delay);
          });
        }

        return mouse;
      })
      .then((mouse) => Promise.race([new Promise((resolve) => page.once('dialog', resolve)), mouse.up()]))
      .then(Return.Undefined());
  }

  acceptDialog(page, message = '', options = {}) {
    return this.waitForDialog(page, options)
      .then((dialog) => dialog.accept(message))
      .finally(() => this.getContext().caches.dialog.delete(page));
  }

  dismissDialog(page, options = {}) {
    return this.waitForDialog(page, options)
      .then((dialog) => dialog.dismiss())
      .finally(() => this.getContext().caches.dialog.delete(page));
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
