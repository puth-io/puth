import process from 'node:process';
import fs from 'node:fs';
import {homedir} from "os";
import path from "path";
import {Cache} from '@puppeteer/browsers';
// @ts-ignore
import {PUPPETEER_REVISIONS} from 'puppeteer-core';

const browserCacheCWD = new Cache(path.join(process.cwd(), '.cache/puppeteer'));
const browserCacheHomedir = new Cache(path.join(homedir(), '.cache/puth'));

export const runtime = (typeof process !== "undefined" && process.versions?.node) ? "node" :
    (typeof Bun !== "undefined") ? "bun" :
        (typeof Deno !== "undefined") ? "deno" :
            (typeof EdgeRuntime !== "undefined") ? "vercel-edge" :
                (typeof navigator !== "undefined" && /\bCloudflare-Workers\b/i.test(navigator.userAgent)) ? "cloudflare-workers" :
                    "unknown";

function checkInstalledBrowsers(browsers: any) {
    const checked = [];
    for (let browser of browsers) {
        if (fs.existsSync(browser.executablePath)) {
            checked.push({
                browser: browser.browser,
                platform: browser.platform,
                buildId: browser.buildId,
                executablePath: browser.executablePath,
            });
            continue;
        }
        
        if (browser.platform === 'linux') {
            const test = browser.executablePath.replace('chrome-linux64', 'chrome-linux');
            if (fs.existsSync(test)) {
                checked.push({
                    browser: browser.browser,
                    platform: browser.platform,
                    buildId: browser.buildId,
                    executablePath: test,
                });
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
