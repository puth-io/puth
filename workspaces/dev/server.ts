import Puth, {installedBrowsers, makeLogger, PuthStandardPlugin} from "puth";

const logger = makeLogger(true);
logger.info(`Installed browsers: ${installedBrowsers.map(i => `${i.browser} ${i.buildId} (${i.platform})`).join(', ')}`)

const instance = new Puth({
  debug: true,
  disableCors: true,
  installedBrowser: installedBrowsers[0],
  logger,
});

instance.use(PuthStandardPlugin);

instance.serve(7345, '127.0.0.1');
