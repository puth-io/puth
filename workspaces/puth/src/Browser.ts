import puppeteer from 'puppeteer';
import defaultArgs from './chromeDefaultArgs.json';
import tmp from 'tmp-promise';

export async function createBrowser(config: any = {}) {
  let {
    headless = true,
    ignoreDefaultArgs = ['--enable-automation'],
    puthArgs = defaultArgs,
    args = [],
    devtools = false,
    slowMo,
    launchOptions = {},
  } = config;

  let { tmpDir, browserCleanup } = await tmp.dir({ unsafeCleanup: true }).then((dir) => {
    return {
      tmpDir: dir.path,
      browserCleanup: () => dir.cleanup(),
    };
  });

  args = [...puthArgs, ...args, '--user-data-dir=' + tmpDir];

  const browser = await puppeteer.launch({
    headless,
    ignoreDefaultArgs,
    args,
    devtools,
    slowMo,
    ...launchOptions,
  });

  return {
    browser,
    browserCleanup,
  };
}
