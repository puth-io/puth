import puth from '../server/Server';
import PuthStandardPlugin from '../server/src/plugins/PuthStandardPlugin';

const instance = puth({ debug: true });

instance.use(PuthStandardPlugin);

instance.listen();
