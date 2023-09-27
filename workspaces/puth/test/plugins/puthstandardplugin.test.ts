import * as assert from 'assert';
import {puthContextBinder} from "../helper";
import {PuthStandardPlugin} from "../../src";

describe(`PuthStandardPlugin`, function () {
  beforeEach(async function () {
    this.timeout(10000);
    await puthContextBinder(this, [PuthStandardPlugin]);
    await this.page.goto('https://playground.puth.dev/');
  });
  afterEach(async function () {
    await this.context.destroy();
  });

  it('should get page title', async function () {
    assert.strictEqual(await this.page.title(), 'Playground - Puth');
  });

  it('should get page url', async function () {
    assert.strictEqual(await this.page.url(), 'https://playground.puth.dev/');
  });

  describe('ElementHandle', function () {
    it('can get value of input', async function () {
      assert.strictEqual(await this.page.$('#properties-value input').value(), 'input with value');
    });

    it('can get value of textarea', async function () {
      assert.strictEqual(await this.page.$('#properties-value textarea').value(), 'textarea with value');
    });

    it('can get value of select', async function () {
      assert.strictEqual(await this.page.$('#properties-value select').value(), 'apple');
    });

    it('can get innerText of element', async function () {
      assert.strictEqual(await this.page.$('#properties-innertext').innerText(), 'div with this innertext');
    });

    it('can get innerHTML of element', async function () {
      assert.strictEqual(
        await this.page.$('#properties-innerhtml').innerHTML(),
        '<div>child div</div> with this innerhtml',
      );
    });

    it('can clear element', async function () {
      await this.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      let input = await this.page.$('#actions-clear').clear();
      assert.strictEqual(await input.value(), '');
    });

    it('can focus element', async function () {
      let focused = await this.page.$('#actions-focus').focus();
      await this.puthAssertStrictEqual(focused, await this.page.focused());
    });

    it('can focus element with selector', async function () {
      await this.page.focus('#actions-focus');
      await this.puthAssertStrictEqual(await this.page.$('#actions-focus'), await this.page.focused());
    });

    it('can blur element', async function () {
      await this.page.$('#actions-focus').focus().blur();
      await this.puthAssertStrictEqual(await this.page.$('body'), await this.page.focused());
    });

    it('can blur element with selector', async function () {
      await this.page.focus('#actions-focus').blur('#actions-focus');
      await this.puthAssertStrictEqual(await this.page.$('body'), await this.page.focused());
    });

    it('can clear element', async function () {
      await this.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

      let input = await this.page.$('#actions-type input').type('puth test verify').clear();

      assert.strictEqual(await input.value(), '');
    });

    it('can click element', async function () {
      await this.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await this.page.$('#actions-click button').click();
      assert.strictEqual(await this.page.$('#actions-click-verify').innerText(), 'clicked button');
    });
  });
});
