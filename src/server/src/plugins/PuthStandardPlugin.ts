import PuthContextPlugin from '../PuthContextPlugin';
import Expects from '../Expects';
import { PuthAssert } from '../PuthAssert';
import { Capability } from '../Context';
import { retryFor } from '../Utils';

export default class PuthStandardPlugin extends PuthContextPlugin {
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
      },
      // resolver: {
      //     Page: {}
      // },
      Context: {
        assertStrictEqual: {
          func: (puth, expected, actual) => PuthAssert.strictEqual(expected, actual),
        },
      },
      Browser: {
        pages: async (browser, index?) => {
          let pages = browser.pages();
          return index != null ? (await pages)[index] : pages;
        },
      },
      Page: {
        contains: {
          func: this.contains,
          expects: Expects.Array,
        },
        evaluate: this.evaluate,
        evaluateRaw: this.evaluateRaw,
        visible: this.visible,
        focused: async (e) => e.evaluateHandle('document.activeElement'),
        blur: this.blur,
        // @ts-ignore
        scrollTo: (el, ...options) => el.evaluate((o) => window.scrollTo(...o), options),
        window: (page) => page.evaluateHandle('window'),
        document: (page) => page.evaluateHandle('document'),
        prefersReducedMotion: async (el, value = 'reduce') => {
          await el.emulateMediaFeatures([
            {
              name: 'prefers-reduced-motion',
              value,
            },
          ]);
          return true;
        },
        _dialog: (page, action, text) => this.getContext().tracked.dialogs.set(page, [action, text]),
      },
      ElementHandle: {
        contains: {
          func: this.contains,
          expects: Expects.Array,
        },
        clickAndWait: this.clickAndWait,
        visible: this.visible,
        children: this.children,
        siblings: this.siblings,
        parents: this.parents,
        blur: this.blur,
        clear: this.clear,
        submit: this.submit,
        value: async (el) => await (await el.getProperty('value')).jsonValue(),
        doubleClick: (el, options) => el.click({ ...options, clickCount: 2 }),
        leftClick: (el, options) => el.click(options),
        middleClick: (el, options) => el.click({ ...options, button: 'middle' }),
        rightClick: (el, options) => el.click({ ...options, button: 'right' }),
        selected: (el) => el.evaluate((s) => s.options.filter((o) => o.selected).map((o) => o.value)),
        scrollIntoView: (el) => el._scrollIntoViewIfNeeded(),
        // @ts-ignore
        scrollTo: (el, ...options) =>
          el.evaluate((e, o) => (e.tagName === 'BODY' ? window.scrollTo(...o) : e.scrollTo(...o)), options),
        innerText: async (el) => (await el.getProperty('innerText')).jsonValue(),
        innerHTML: async (el) => (await el.getProperty('innerHTML')).jsonValue(),
      },
    });
  }

  contains(element, search, options?) {
    return retryFor(
      this.getContext().getTimeout(options),
      async (_) => await element.$x('.//*[contains(text(), "' + search + '")]'),
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

  async blur(element, selector?) {
    if (selector) {
      element = await element.$(selector);
    }

    return await element.evaluate((e) => e.blur());
  }

  async clear(element) {
    await element.click({ clickCount: 3 });
    await element._page.keyboard.press('Backspace');
  }

  async submit(element, selector) {
    if (selector) {
      element = await element.$(selector);
    }

    await element.evaluate((form) => form.submit());
  }

  async clickAndWait(element, options, waitOptions) {
    await Promise.all([element.click(options), element?._page.waitForNavigation(waitOptions)]);
  }

  async evaluate(page, func) {
    if (this.getContext().hasCapability(Capability.EVAL)) {
      // TODO Bypass puppeteer func type check
      // 1: puppeteer evaluate runs Runtime.evaluate if func is type String
      //    else Runtime.callFunctionOn is used. We need to bypass this check
      //    so we can give puppeteer the raw string.
      // tslint:disable-next-line:no-eval
      func = eval(func);
    }
    return await page.evaluate(func);
  }

  async evaluateRaw(page, func) {
    return await page.evaluate(func);
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
}
