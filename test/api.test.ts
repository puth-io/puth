import { RemoteContext } from '../src/client/RemoteObject';
import puth from '../src/server/Server';
import PuthStandardPlugin from '../src/server/src/plugins/PuthStandardPlugin';
import { LocalPuthClient } from '../src';
import { RemotePuthClient } from '../src';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const assert = chai.assert;

const envs: [string, () => any][] = [
  ['remote', () => new RemotePuthClient('http://127.0.0.1:4000')],
  ['local', () => new LocalPuthClient()],
];

envs.forEach((env) => {
  before(function () {
    if (env[0] === 'remote') {
      this.__remoteTestInstance = puth();
      this.__remoteTestInstance.use(PuthStandardPlugin);
      this.__remoteTestInstance.serve(4000, '127.0.0.1', false);
      this.timeout(5000);
    }
  });

  after(async function () {
    if (env[0] === 'remote') {
      await this.__remoteTestInstance.getServer().close();
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
      return assert.isFulfilled(this.context.destroy());
    });

    it('can delete context', async function () {
      return assert.isFulfilled(this.context.destroy());
    });

    it('can call a function on context', async function () {
      let rep = await (await this.context.createBrowser()).getRepresentation();
      assert.containsAllKeys(rep, ['id', 'type']);
      assert.strictEqual(rep?.represents, 'Browser');

      return assert.isFulfilled(this.context.destroy());
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
          'Undefined: Property ___delete_test not found on Page',
        );
      });
    });
  });
});
