#!/usr/bin/env node

// Imports
const fs = require('fs');
const path = require('path');
const meow = require('meow');

const { Puth } = require('../lib/server/Server');
const { createBrowser } = require('../browser/core');

const PuthStandardPlugin = require('../lib/server/src/plugins/PuthStandardPlugin').default;

const cli = meow(
  `
	Usage
	  $ puth command [options]

  Commands
    $ puth start [options]
    
      --debug    -d     Enables debug output
      --address  -a     Address to use (defaults to 127.0.0.1)
      --port     -p     Port to use (default to 4000)
      
    $ puth daemon [options]
    
      --debug    -d     Enables debug output
`,
  {
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
        default: 4000,
        alias: 'p',
      },
      noserver: {
        type: 'boolean',
        default: false,
      },
    },
  },
);

const cwd = process.cwd();
const input = cli.input;
const flags = cli.flags;

// Debug
debug('cwd =', cwd);
debug('input =', input);
debug('flags =', flags);

// Puth config
let puthConfig = {
  address: flags.address,
  port: flags.port,
  debug: flags.debug,
  server: !flags.noserver,
};

if (fs.existsSync(path.join(cwd, 'puth.config.json'))) {
  const puthConfigFile = JSON.parse(fs.readFileSync(path.join(cwd, 'puth.config.json'), 'utf8'));

  puthConfig = {
    ...puthConfig,
    ...puthConfigFile,
  };
  debug('puth.config.json =', puthConfig);
}

// Commands
if (input[0] === 'start') {
  start();
} else if (input[0] === 'daemon') {
  daemon();
} else if (input[0] === 'dev') {
  dev();
}

async function start() {
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

async function daemon() {
  const instance = await createBrowser({
    launchOptions: {
      headless: false,
      dumpio: flags.debug,
    },
    args: ['--no-sandbox'],
  });

  !flags.debug && console.log('DevTools listening on', await instance.browser.wsEndpoint());
}

// Util
function debug(...args) {
  if (flags.debug) {
    console.log.apply(null, args);
  }
}
