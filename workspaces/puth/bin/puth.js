#!/usr/bin/env node

// Imports
const fs = require('fs');
const path = require('path');
const {homedir} = require("os");
const meow = require('meow');
const prompts = require('@inquirer/prompts');
const {detectBrowserPlatform, canDownload, install} = require('@puppeteer/browsers');
const {PUPPETEER_REVISIONS} = require("puppeteer-core");
const pkg = require('../package.json');

const Puth = require('../lib').default;
const {installedBrowsers, makeLogger, PuthStandardPlugin} = require("../lib");

const cli = meow(`
Usage
  $ puth command [options]

Commands
  $ puth start [options]
  
    --debug    -d     Enables debug output
    --address  -a     Address to use (defaults to 127.0.0.1)
    --port     -p     Port to use (default to 7345)
    --disable-cors    Disables all CORS policies
    --json-logger     Formats logs to json
`, {
      booleanDefault: true,
      flags: {
        debug: {
          type: 'boolean',
          alias: 'd',
          default: false,
        },
        address: {
          type: 'string',
          default: '127.0.0.1',
          alias: 'a',
        },
        port: {
          type: 'number',
          default: 7345,
          alias: 'p',
        },
        disableCors: {
          type: 'boolean',
          default: false,
        },
        jsonLogger: {
          type: 'boolean',
          default: false,
        },
        prettyLogger: {
          type: 'boolean',
          default: false,
        },
      },
    },
);

const cwd = process.cwd();
const input = cli.input;
const flags = cli.flags;

let pretty = process.stdout.isTTY;
if (flags.prettyLogger === true) pretty = true;
if (flags.jsonLogger === true) pretty = false;
const logger = makeLogger(pretty);

logger.debug({cwd, input, flags});

// Puth config
let puthConfig = {
  address: flags.address,
  port: flags.port,
  debug: flags.debug,
  disableCors: flags.disableCors,
  logger,
};

if (fs.existsSync(path.join(cwd, 'puth.config.json'))) {
  const puthConfigFile = JSON.parse(fs.readFileSync(path.join(cwd, 'puth.config.json'), 'utf8'));

  puthConfig = {
    ...puthConfig,
    ...puthConfigFile,
  };
  debug('puth.config.json =', puthConfig);
}

// Register SIGTERM and SIGINT
process.on('SIGTERM', () => {
  process.exit(0);
});
process.on('SIGINT', () => {
  process.exit(0);
});

// Commands
if (input[0] === 'start') {
  ensureChromeInstallation()
      .then(_ => version())
      .then(_ => start());
} else if (input[0] === 'dev') {
  dev();
} else if (input[0] === 'version') {
  console.log(pkg.version);
} else if (input[0] === 'info') {
  version();
  logger.info(`Using browser: ${installedBrowsers[0].browser} ${installedBrowsers[0].buildId} (${installedBrowsers[0].platform})`);
}  else if (input[0] === 'browser') {
  if (input[1] === 'install') {
    const platform = getPlatform();
    const browser = input[2];
    const channel = input[3];
  }
} else {
  cli.showHelp();
}

function version() {
  logger.info('Puth version ' + pkg.version)
}

async function ensureChromeInstallation() {
  if (installedBrowsers.length !== 0) {
    return; // applicable browser found
  }
  
  return browserInstaller();
}

async function browserInstaller() {
  const buildId = PUPPETEER_REVISIONS.chrome;
  const platform = detectBrowserPlatform();
  const channel = 'chrome';
  
  if (! await prompts.confirm({ message: `No chrome installations found. Would you like to download chrome (${buildId} (${platform}))?` })) {
    console.error('Exiting. No chrome installations found.');
    process.exit(1);
  }
  
  const cacheRootHome = path.join(homedir(), '/.cache/puth');
  const cacheRootCwd = path.join(cwd, '/.cache/puppeteer');
  
  const cache = await prompts.select({
    message: 'Select download location',
    choices: [
      {name: `home dir (${cacheRootHome})`, value: cacheRootHome},
      {name: `current working directory (${cacheRootCwd})`, value: cacheRootCwd},
    ],
  });
  
  const installOptions = {browser: channel, platform, buildId, cacheDir: cache};
  installOptions.downloadProgressCallback = throttle((downloadedBytes, totalBytes) => {
    const steps = 20;
    const step = Math.round(steps * downloadedBytes / totalBytes);
    const mb = 1000 * 1000;
    process.stdout.write(`\rDownloading [${'.'.repeat(step)}${' '.repeat(steps - step)}] ${step * (100/steps)}% | ${Math.round(downloadedBytes/mb)}/${Math.round(totalBytes/mb)}MB`);
    if (downloadedBytes === totalBytes) process.stdout.write("\n");
  }, 50);
  await canDownload(installOptions);
  const browser = await install(installOptions); // cleanup progress bar
  
  logger.info(`Successfully downloaded browser ${browser.browser} ${browser.buildId} (${browser.platform})`);
  
  installedBrowsers.push(browser);
}

async function start() {
  puthConfig.installedBrowser = installedBrowsers[0];
  
  let instance = new Puth(puthConfig);
  instance.use(PuthStandardPlugin);
  await instance.serve(puthConfig.port, puthConfig.address);
}

async function dev() {
  let instance = new Puth({
    ...puthConfig,
    dev: true,
  });
  instance.use(PuthStandardPlugin);
  await instance.serve(puthConfig.port, puthConfig.address);
}

// Util
function debug(...args) {
  if (flags.debug) {
    console.log.apply(null, args);
  }
}

function throttle(func, timeFrame) {
  let timer;
  let lastArgs = [];
  let mediator = _ => {
    timer = null;
    func(...lastArgs);
  }
  return function (...args) {
    lastArgs = args;
    if (!timer) {
      timer = setTimeout(mediator, timeFrame);
    }
  };
}
