// @ts-nocheck
import process from 'node:process';
import fs from 'node:fs';
import {homedir} from "os";
import path from "path";
import {PUPPETEER_REVISIONS} from 'puppeteer-core';
import {Cache} from '@puppeteer/browsers';

const browserCacheCWD = new Cache(path.join(process.cwd(), '.cache/puppeteer'));
const browserCacheHomedir = new Cache(path.join(homedir(), '.cache/puth'));

function checkInstalledBrowsers(browsers) {
    const checked = [];
    for (let browser of browsers) {
        if (fs.existsSync(browser.executablePath)) {
            checked.push({browser: browser.browser, platform: browser.platform, buildId: browser.buildId, executablePath: browser.executablePath});
            continue;
        }
        
        if (browser.platform === 'linux') {
            const test = browser.executablePath.replace('chrome-linux64', 'chrome-linux');
            if (fs.existsSync(test)) {
                checked.push({browser: browser.browser, platform: browser.platform, buildId: browser.buildId, executablePath: test});
                continue;
            }
        }
    }
    return checked;
}

export const allBrowserInstallations = [
    ...checkInstalledBrowsers(browserCacheCWD.getInstalledBrowsers()).reverse(),
    ...checkInstalledBrowsers(browserCacheHomedir.getInstalledBrowsers()).reverse(),
];

export const unusableBrowserInstallations = allBrowserInstallations.filter(browser => browser.buildId != PUPPETEER_REVISIONS.chrome);

// TODO add --browser={system|home|cwd} parameter
export const usableBrowserInstallations = allBrowserInstallations.filter(browser => browser.buildId == PUPPETEER_REVISIONS.chrome);
