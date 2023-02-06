import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import Puth, { PuthStandardPlugin } from '../';
import LocalPuthClient from '@puth/client/LocalPuthClient';
import RemotePuthClient from '@puth/client/RemotePuthClient';
import { RemoteContext } from '@puth/client/RemoteObject';

chai.use(chaiAsPromised);

const assert = chai.assert;

const envs: [string, () => any][] = [
  ['remote', () => new RemotePuthClient(process.env.PUTH_URL ?? 'http://127.0.0.1:43210')],
  ['local', () => new LocalPuthClient()],
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
      this.__remoteTestInstance = new Puth();
      this.__remoteTestInstance.use(PuthStandardPlugin);
      this.__remoteTestInstance.serve(43210, '127.0.0.1', false);
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
      this.context = await this.remote.contextCreate();
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
      assert.strictEqual(rep?.represents, 'CDPBrowser');
      assert.isFulfilled(this.context.destroy());
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

        return assert.isRejected(
          this.page._getProperty('___delete_test'),
          'Undefined: Property "___delete_test" not found on CDPPage',
        );
      });
    });
  });
}
