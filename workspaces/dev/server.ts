import Puth, {installedBrowsers, PuthStandardPlugin} from "puth";

const instance = new Puth({
  debug: true,
  disableCors: true,
  installedBrowser: installedBrowsers[0],
});

instance.use(PuthStandardPlugin);

instance.serve(7345, '127.0.0.1');
