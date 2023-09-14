import Puth, { PuthStandardPlugin } from "puth";

const instance = new Puth({
  debug: true,
  disableCors: true,
});

instance.use(PuthStandardPlugin);

instance.serve(7345, '127.0.0.1');
