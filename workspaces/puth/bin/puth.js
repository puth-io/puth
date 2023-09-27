#!/usr/bin/env node

// Imports
const fs = require('fs');
const path = require('path');
const meow = require('meow');
const prompts = require('@inquirer/prompts');
const {resolveBuildId, canDownload, install} = require('@puppeteer/browsers');
const pkg = require('../package.json');

const Puth = require('../lib').default;
const {getPlatform, installedBrowsers, makeLogger} = require("../lib");
const {homedir} = require("os");

const PuthStandardPlugin = require('../lib/plugins/PuthStandardPlugin').PuthStandardPlugin;

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
        },
        prettyLogger: {
          type: 'boolean',
        },
      },
    },
);

const cwd = process.cwd();
const input = cli.input;
const flags = cli.flags;

let pretty = flags.prettyLogger ?? process.stdout.isTTY;
if (flags.jsonLogger) pretty = false;
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
  info();
  ensureChromeInstallation()
      .then(_ => start());
} else if (input[0] === 'dev') {
  dev();
} else if (input[0] === 'version') {
  console.log(pkg.version);
} else if (input[0] === 'info') {
  info();
} else {
  cli.showHelp();
}

function info() {
  logger.info('Puth version ' + pkg.version);
  logger.info(`Installed browsers: ${installedBrowsers.map(i => `${i.browser} ${i.buildId} (${i.platform})`).join(', ')}`);
}

async function ensureChromeInstallation() {
  if (installedBrowsers.length !== 0) {
    return;
  }
  
  if (! await prompts.confirm({ message: 'No chrome installations found. Would you like to download chrome?' })) {
    console.error('Exiting. No chrome installations found.');
    process.exit(1);
  }
  
  const detectedPlatform = getPlatform();
  const platform = await prompts.select({
    message: `Select your platform (detected: ${detectedPlatform})`,
    choices: [
      {value: detectedPlatform},
      new prompts.Separator('----- Other platforms -----'),
        ...['linux', 'dawrin', 'wsl', 'win32'].filter(p => p !== detectedPlatform).map(p => ({value: p})),
    ],
  });
  
  const browser = await prompts.select({
    message: 'Select a browser',
    choices: [
      {value: 'chrome'},
      {value: 'chromium'},
      // {value: 'firefox (unsupported)'},
    ],
  });
  
  const channel = await prompts.select({
    message: 'Select a chrome channel',
    choices: [
      {value: 'stable'},
      {value: 'latest'},
      {value: 'beta'},
      {value: 'canary'},
      {value: 'dev'},
    ],
  });
  
  const cacheRoot = await prompts.select({
    message: 'Select download location',
    choices: [
      {name: `current working directory (${cwd})`, value: cwd},
      {name: `home dir (${homedir()})`, value: homedir()},
      // {value: 'custom'},
    ],
  });
  
  const buildId = await resolveBuildId(browser, platform, channel);
  const download = {browser, platform, buildId, cacheDir: cacheRoot + '/.cache/puppeteer'};
  
  await canDownload(download);
  await install(download);
  
  // TODO add new browser to installedBrowsers
}

async function start() {
  const usedBrowser = installedBrowsers[0];
  puthConfig.installedBrowser = usedBrowser;
  console.log(`[Puth] Using browser: ${usedBrowser.browser} ${usedBrowser.buildId} (${usedBrowser.platform})`);
  
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
