import Puth, { PuthStandardPlugin } from "puth";

const instance = new Puth({
  debug: true,
  disableCors: true,
});

instance.use(PuthStandardPlugin);

instance.serve(7345, "0.0.0.0");
