import * as assert from 'assert';
import PuthStandardPlugin from '../../src/server/src/plugins/PuthStandardPlugin';
import { LocalPuthClient } from '../../src';

export async function puthContextBinder(mochaContext) {
  mochaContext.remote = new LocalPuthClient({ silent: true });
  await mochaContext.remote.getPuth().use(PuthStandardPlugin);

  mochaContext.remote.setAssertionHandler((assertion) => {
    if (!assertion.result) {
      assert.fail(assertion.message);
    }
  });

  mochaContext.context = await mochaContext.remote.contextCreate({
    snapshot: true,
    track: ['commands', 'console', 'network'],
  });
  mochaContext.browser = await mochaContext.context.createBrowser();

  mochaContext.page = (await mochaContext.browser.pages())[0];
  mochaContext.puthAssertStrictEqual = async (handle1, handle2) => {
    let response = await mochaContext.context.assertStrictEqual(
        await handle1.getRepresentation(),
        await handle2.getRepresentation(),
    );
    return assert.ok(response.result, 'handle1 and handle2 are not equal');
  };
}

describe(`PuthStandardPlugin`, function () {
  beforeEach(async function () {
    await puthContextBinder(this);

    await this.page.goto('https://playground.puth.dev/');
  });
  afterEach(async function () {
    await this.context.destroy();
  });

  it('should get page title', async function () {
    assert.strictEqual(await this.page.title(), 'Puth - Playground');
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
      await this.page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
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
      await this.page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);

      let input = await this.page.$('#actions-type input').type('puth test verify').clear();

      assert.strictEqual(await input.value(), '');
    });

    it('can click element', async function () {
      await this.page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
      await this.page.$('#actions-click button').click();
      assert.strictEqual(await this.page.$('#actions-click-verify').innerText(), 'clicked button');
    });
  });
});