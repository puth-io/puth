const puppeteer = require('puppeteer');
const defaultArgs = require('./chromeDefaultArgs');
const tmp = require('tmp-promise');

async function createBrowser(config = {}) {
  let {
    headless = true,
    ignoreDefaultArgs = ['--enable-automation'],
    puthArgs = defaultArgs,
    args = [],
    devtools = false,
    slowMo = undefined,
    launchOptions = {},
  } = config;

  let {tmpDir, browserCleanup} = await tmp.dir({unsafeCleanup: true})
    .then(dir => {
      return {
        tmpDir: dir.path,
        browserCleanup: () => dir.cleanup(),
      };
    });

  args = [
    ...puthArgs,
    ...args,
    '--user-data-dir=' + tmpDir,
  ];

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

module.exports = {
  createBrowser,
};