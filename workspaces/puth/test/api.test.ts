import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {PuthStandardPlugin} from '../';
import {RemotePuthClient} from '@puth/client';
import Constructors from "../src/context/Constructors";
import {makeLocalPuthClient, makePuthServer} from "./helper";
import {sleep} from "../src/Utils";

chai.use(chaiAsPromised);

const assert = chai.assert;

const envs: [string, () => any][] = [
  ['remote', () => new RemotePuthClient(process.env.PUTH_URL ?? 'http://127.0.0.1:43210')],
  ['local', () => makeLocalPuthClient()],
];

if (process.env.TEST_ONLY_REMOTE) {
  puthContextTests(envs[0]);
} else if (process.env.TEST_ONLY_LOCAL) {
  puthContextTests(envs[1]);
} else {
  envs.forEach((env) => {
    puthContextTests(env);
  });
}

function puthContextTests(env) {
  before(function () {
    if (env[0] === 'remote' && !process.env.PUTH_URL) {
      this.__remoteTestInstance = makePuthServer(43210, '127.0.0.1');
    }
  });

  after(async function () {
    if (env[0] === 'remote') {
      await this.__remoteTestInstance?.getServer()?.close();
    }
  });

  describe(`Api [${env[0]}]`, function () {
    beforeEach(async function () {
      this.remote = env[1]();

      if (env[0] === 'local') {
        this.remote.use(PuthStandardPlugin);
      }

      this.context = await this.remote.contextCreate({
        snapshot: true,
      });
    });

    it('can create context', async function () {
      let rep = this.context.representation;
      assert.ok('id' in rep && 'type' in rep);
      assert.isFulfilled(this.context.destroy());
    });

    it('can delete context', async function () {
      assert.isFulfilled(this.context.destroy());
    });

    it('can call a function on context', async function () {
      let rep = await (await this.context.createBrowser()).getRepresentation();
      assert.containsAllKeys(rep, ['id', 'type']);
      assert.strictEqual(rep?.represents, Constructors.Browser);
      assert.isFulfilled(this.context.destroy());
    });

    describe('Browser', function () {
      it('can visit site', async function () {
        let browser = await this.context.createBrowser();

        let page = (await browser.pages())[0];
        await page.visit('https://playground.puth.dev');

        assert.strictEqual(await page.url(), 'https://playground.puth.dev/');
        assert.isFulfilled(this.context.destroy());
      });
    });

    describe('RemoteContext', function () {
      beforeEach(async function () {
        this.browser = await this.context.createBrowser();
        this.page = (await this.browser.pages())[0];
      });

      afterEach(async function () {
        await this.page.close();
        await this.context.destroy();
      });

      it('can set and get property', async function () {
        this.page.___set_test = true;
        assert.ok((await this.page._getProperty('___set_test')) === true);
      });

      it('can delete property', async function () {
        this.page.___delete_test = true;
        assert.ok(await this.page._getProperty('___delete_test'));
        delete this.page.___delete_test;
        await sleep(500);
        await assert.isRejected(this.page._getProperty('___delete_test'));
      });
    });
  });
}
