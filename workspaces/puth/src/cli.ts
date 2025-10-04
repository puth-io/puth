import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import meow from 'meow';
import * as prompts from '@inquirer/prompts';
import { detectBrowserPlatform, canDownload, install, Browser } from '@puppeteer/browsers';
import pkg from '../package.json';
import { Puth } from './Puth';
import { PuthStandardPlugin } from './plugins/PuthStandardPlugin';
import { LiveViewContextPlugin, LiveViewSnapshotPlugin } from './plugins/LiveViewPlugin';
import { usableBrowserInstallations } from './utils/Platform';
import { makeLogger } from './utils/Logger';
// @ts-ignore
import {PUPPETEER_REVISIONS} from 'puppeteer-core';

const cli = meow(
    `
Usage
  $ puth command [options]

Commands
  $ puth start [options]
  
    --debug    -d     Enables debug output
    --address  -a     Address to use (defaults to 127.0.0.1)
    --port     -p     Port to use (default to 7345)
    --disable-cors    Disables all CORS policies
    --json-logger     Formats logs to json
`,
    {
        importMeta: import.meta,
        booleanDefault: true,
        flags: {
            debug: {
                type: 'boolean',
                shortFlag: 'd',
                default: false,
            },
            address: {
                type: 'string',
                default: '127.0.0.1',
                shortFlag: 'a',
            },
            port: {
                type: 'number',
                default: 7345,
                shortFlag: 'p',
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
            cleanupOtherInstalls: {
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

logger.debug({ cwd, input, flags });

const buildId = PUPPETEER_REVISIONS.chrome;
const platform = detectBrowserPlatform();

// Puth config
let puthConfig = {
    address: flags.address,
    port: flags.port,
    debug: flags.debug,
    cors: {
        enabled: flags.disableCors !== false,
    },
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
        .then((_) => version())
        .then((_) => start());
} else if (input[0] === 'dev') {
    dev();
} else if (input[0] === 'version') {
    console.log(pkg.version);
} else if (input[0] === 'info') {
    version();
    logger.info(
        `Using browser: ${usableBrowserInstallations[0].browser} ${usableBrowserInstallations[0].buildId} (${usableBrowserInstallations[0].platform})`,
    );
} else if (input[0] === 'browser') {
    if (input[1] === 'install') {
        browserInstaller(input[2]);
    }
} else {
    cli.showHelp();
}

function version() {
    logger.info('Puth version: ' + pkg.version);
}

async function ensureChromeInstallation() {
    if (usableBrowserInstallations.length !== 0) {
        return; // applicable browser found
    }

    if (
        !(await prompts.confirm({
            message: `No chrome installation found. Would you like to download chrome (${buildId} (${platform}))?`,
        }))
    ) {
        logger.error('Exiting. No chrome installation found.');
        process.exit(1);
    }

    return browserInstaller();
}

async function browserInstaller(cache?: string) {
    const channel = Browser.CHROME;

    const cacheRootHome = path.join(homedir(), '/.cache/puth');
    const cacheRootCwd = path.join(cwd, '/.cache/puppeteer');

    if (cache == null) {
        cache = await prompts.select({
            message: 'Select download location',
            choices: [
                { name: `home dir (${cacheRootHome})`, value: cacheRootHome },
                { name: `current working directory (${cacheRootCwd})`, value: cacheRootCwd },
            ],
        });
    } else if (cache === 'cwd') {
        cache = cacheRootCwd;
    } else if (cache === 'home') {
        cache = cacheRootHome;
    }

    const checkInstallDirectory = path.join(cache, channel, `${platform}-${buildId}`);
    if (fs.existsSync(checkInstallDirectory)) {
        logger.info(`Aborting browser install. Folder exists ${checkInstallDirectory}.`);
        return;
    }
    if (flags.cleanupOtherInstalls) {
        if (fs.existsSync(cache)) {
            logger.info(`Removing existing cache directory ${cache}`);
            fs.rmSync(cache, { recursive: true, force: true });
        }
    }

    const installOptions = { browser: channel, platform, buildId, cacheDir: cache, downloadProgressCallback: throttle((downloadedBytes: number, totalBytes: number) => {
        const steps = 20;
        const step = Math.round((steps * downloadedBytes) / totalBytes);
        const mb = 1000 * 1000;
        process.stdout.write(
            `\rDownloading [${'.'.repeat(step)}${' '.repeat(steps - step)}] ${step * (100 / steps)}% | ${Math.round(
                downloadedBytes / mb,
            )}/${Math.round(totalBytes / mb)}MB`,
        );
        if (downloadedBytes === totalBytes) process.stdout.write('\n');
    }, 100)};
    await canDownload(installOptions);
    const browser = await install(installOptions); // cleanup progress bar

    logger.info(`Successfully downloaded ${browser.browser} ${browser.buildId} (${browser.platform})`);

    usableBrowserInstallations.push(browser);
}

async function start() {
    puthConfig.installedBrowser = usableBrowserInstallations[0];
    logger.info(
        `Installed browsers: ${usableBrowserInstallations
            .map((i) => `${i.browser} ${i.buildId} (${i.platform})`)
            .join(', ')}`,
    );

    let instance = new Puth(puthConfig);
    instance.use(PuthStandardPlugin);
    instance.use(LiveViewContextPlugin);
    instance.use(LiveViewSnapshotPlugin);
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

function throttle(func, wait) {
    let timer;
    let lastArgs = [];
    let mediator = (_) => {
        timer = null;
        func(...lastArgs);
    };
    return function (...args) {
        lastArgs = args;
        if (!timer) timer = setTimeout(mediator, wait);
    };
}
