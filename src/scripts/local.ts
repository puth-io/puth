import puth from '../server/Server';
import PuthStandardPlugin from '../server/src/plugins/PuthStandardPlugin';

const instance = puth({
  debug: true,
  server: {
    allowOrigins: ['http://localhost:3000'],
  },
});

instance.use(PuthStandardPlugin);

instance.serve();
