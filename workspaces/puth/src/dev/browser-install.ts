import path from 'path';
import {homedir} from 'os';
import {select} from '@inquirer/prompts';
import fs from 'fs';
import {canDownload, detectBrowserPlatform, install, Browser} from '@puppeteer/browsers';
import {makeLogger} from 'puth';
// @ts-ignore
import { PUPPETEER_REVISIONS } from 'puppeteer-core';

const logger = makeLogger(true, 'info');
const cwd = process.cwd();
const buildId = PUPPETEER_REVISIONS.chrome;
const platform = detectBrowserPlatform();

const channel = Browser.CHROME;

const cacheRootHome = path.join(homedir(), '/.cache/puth');
const cacheRootCwd = path.join(cwd, '/.cache/puppeteer');

(async () => {
    let cache = await select({
        message: 'Select download location',
        choices: [
            {name: `home dir (${cacheRootHome})`, value: cacheRootHome},
            {name: `current working directory (${cacheRootCwd})`, value: cacheRootCwd},
        ],
    });

    const checkInstallDirectory = path.join(cache, channel, `${platform}-${buildId}`);
    if (fs.existsSync(checkInstallDirectory)) {
        logger.info(`Aborting browser install. Folder exists ${checkInstallDirectory}.`);
        return;
    }

    const installOptions = {
        browser: channel,
        platform, buildId,
        cacheDir: cache,
        downloadProgressCallback: throttle((downloadedBytes, totalBytes) => {
            const steps = 20;
            const step = Math.round(steps * downloadedBytes / totalBytes);
            const mb = 1000 * 1000;
            process.stdout.write(`\rDownloading [${'.'.repeat(step)}${' '.repeat(steps - step)}] ${step * (100/steps)}% | ${Math.round(downloadedBytes/mb)}/${Math.round(totalBytes/mb)}MB`);
            if (downloadedBytes === totalBytes) process.stdout.write("\n");
        }, 100),
    };
    await canDownload(installOptions);
    const browser = await install(installOptions); // cleanup progress bar

    logger.info(`Successfully downloaded ${browser.browser} ${browser.buildId} (${browser.platform})`);
})();

function throttle(func: any, wait: number) {
    let timer: NodeJS.Timeout | null;
    let lastArgs: any[] = [];
    let mediator = _ => {
        timer = null;
        func(...lastArgs);
    }
    return function (...args: any[]) {
        lastArgs = args;
        if (!timer) timer = setTimeout(mediator, wait);
    };
}
