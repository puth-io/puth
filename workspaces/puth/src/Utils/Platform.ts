// @ts-nocheck
/**
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function escapeStringRegexp(str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected a string');
    }
    
    // Escape characters with special meaning either inside or outside character sets.
    // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
    return str
        .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
        .replace(/-/g, '\\x2d');
}

/**
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import process from 'node:process';
import os from 'node:os';
import fs from 'node:fs';

let isDockerCached;

function hasDockerEnv() {
    try {
        fs.statSync('/.dockerenv');
        return true;
    } catch {
        return false;
    }
}

function hasDockerCGroup() {
    try {
        return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    } catch {
        return false;
    }
}

export function isDocker() {
    if (isDockerCached === undefined) {
        isDockerCached = hasDockerEnv() || hasDockerCGroup();
    }
    
    return isDockerCached;
}

/**
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function isWsl() {
    if (process.platform !== 'linux') {
        return false;
    }
    
    if (os.release().toLowerCase().includes('microsoft')) {
        if (isDocker()) {
            return false;
        }
        
        return true;
    }
    
    try {
        return fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
            ? !isDocker() : false;
    } catch {
        return false;
    }
}

/**
 * Platforms: [aix, darwin, freebsd, linux, openbsd, sunos, win32, wsl]
 */
export function getPlatform() {
    return isWsl() ? 'wsl' : process.platform;
}

/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
import path from 'path';
import {execSync, execFileSync} from 'child_process';

const newLineRegex = /\r?\n/;

export function darwinFast() {
    const priorityOptions = [
        process.env.CHROME_PATH,
        process.env.LIGHTHOUSE_CHROMIUM_PATH,
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
    
    for (const chromePath of priorityOptions) {
        if (chromePath && canAccess(chromePath)) return chromePath;
    }
    
    return darwin()[0]
}

export function darwin() {
    const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];
    
    const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
        '/Versions/A/Frameworks/LaunchServices.framework' +
        '/Versions/A/Support/lsregister';
    
    const installations = [];
    
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    
    execSync(
        `${LSREGISTER} -dump` +
        ' | grep -i \'google chrome\\( canary\\)\\?\\.app\'' +
        ' | awk \'{$1=""; print $0}\'')
        .toString()
        .split(newLineRegex)
        .forEach((inst) => {
            suffixes.forEach(suffix => {
                const execPath = path.join(inst.substring(0, inst.indexOf('.app') + 4).trim(), suffix);
                if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
                    installations.push(execPath);
                }
            });
        });
    
    
    // Retains one per line to maintain readability.
    // clang-format off
    const home = escapeStringRegexp(process.env.HOME || os.homedir());
    const priorities = [
        {regex: new RegExp(`^${home}/Applications/.*Chrome\\.app`), weight: 50},
        {regex: new RegExp(`^${home}/Applications/.*Chrome Canary\\.app`), weight: 51},
        {regex: /^\/Applications\/.*Chrome.app/, weight: 100},
        {regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101},
        {regex: /^\/Volumes\/.*Chrome.app/, weight: -2},
        {regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1},
    ];
    
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift({regex: new RegExp(escapeStringRegexp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 150});
    }
    
    if (process.env.CHROME_PATH) {
        priorities.unshift({regex: new RegExp(escapeStringRegexp(process.env.CHROME_PATH)), weight: 151});
    }
    
    // clang-format on
    return sort(installations, priorities);
}

function resolveChromePath() {
    if (canAccess(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    
    if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
        log.warn(
            'ChromeLauncher',
            'LIGHTHOUSE_CHROMIUM_PATH is deprecated, use CHROME_PATH env variable instead.');
        return process.env.LIGHTHOUSE_CHROMIUM_PATH;
    }
    
    return undefined;
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
export function linux() {
    let installations = [];
    
    // 1. Look into CHROME_PATH env variable
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    
    // 2. Look into the directories where .desktop are saved on gnome based distro's
    const desktopInstallationFolders = [
        path.join(os.homedir(), '.local/share/applications/'),
        '/usr/share/applications/',
    ];
    desktopInstallationFolders.forEach(folder => {
        installations = installations.concat(findChromeExecutables(folder));
    });
    
    // Look for google-chrome(-stable) & chromium(-browser) executables by using the which command
    const executables = [
        'google-chrome-stable',
        'google-chrome',
        'chromium-browser',
        'chromium',
    ];
    executables.forEach((executable) => {
        try {
            const chromePath =
                execFileSync('which', [executable], {stdio: 'pipe'}).toString().split(newLineRegex)[0];
            
            if (canAccess(chromePath)) {
                installations.push(chromePath);
            }
        } catch (e) {
            // Not installed.
        }
    });
    
    if (!installations.length) {
        throw new Error('Chrome path not set');
    }
    
    const priorities = [
        {regex: /chrome-wrapper$/, weight: 51},
        {regex: /google-chrome-stable$/, weight: 50},
        {regex: /google-chrome$/, weight: 49},
        {regex: /chromium-browser$/, weight: 48},
        {regex: /chromium$/, weight: 47},
    ];
    
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift(
            {regex: new RegExp(escapeStringRegexp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 100});
    }
    
    if (process.env.CHROME_PATH) {
        priorities.unshift({regex: new RegExp(escapeStringRegexp(process.env.CHROME_PATH)), weight: 101});
    }
    
    return sort(uniq(installations.filter(Boolean)), priorities);
}

export function toWSLPath(dir, fallback): string {
    try {
        return execFileSync('wslpath', ['-u', dir]).toString().trim();
    } catch {
        return fallback;
    }
}

function getLocalAppDataPath(localPath): string {
    const userRegExp = /\/mnt\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
    const results = userRegExp.exec(localPath) || [];
    
    return `/mnt/${results[1]}/Users/${results[2]}/AppData/Local`;
}

export function getWSLLocalAppDataPath(localPath): string {
    const userRegExp = /\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
    const results = userRegExp.exec(localPath) || [];
    
    return toWSLPath(
        `${results[1]}:\\Users\\${results[2]}\\AppData\\Local`, getLocalAppDataPath(localPath));
}

export function wsl() {
    // Manually populate the environment variables assuming it's the default config
    process.env.LOCALAPPDATA = getWSLLocalAppDataPath(`${process.env.PATH}`);
    process.env.PROGRAMFILES = toWSLPath('C:/Program Files', '/mnt/c/Program Files');
    process.env['PROGRAMFILES(X86)'] =
        toWSLPath('C:/Program Files (x86)', '/mnt/c/Program Files (x86)');
    
    return win32();
}

export function win32() {
    const installations = [];
    const suffixes = [
        `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
        `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
    ];
    const prefixes = [
        process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']
    ].filter(Boolean);
    
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    
    prefixes.forEach(prefix => suffixes.forEach(suffix => {
        const chromePath = path.join(prefix, suffix);
        if (canAccess(chromePath)) {
            installations.push(chromePath);
        }
    }));
    return installations;
}

function sort(installations, priorities) {
    const defaultPriority = 10;
    return installations
        // assign priorities
        .map((inst) => {
            for (const pair of priorities) {
                if (pair.regex.test(inst)) {
                    return {path: inst, weight: pair.weight};
                }
            }
            return {path: inst, weight: defaultPriority};
        })
        // sort based on priorities
        .sort((a, b) => (b.weight - a.weight))
        // remove priority flag
        .map(pair => pair.path);
}

function canAccess(file) {
    if (!file) {
        return false;
    }
    
    try {
        fs.accessSync(file);
        return true;
    } catch (e) {
        return false;
    }
}

function uniq(arr) {
    return Array.from(new Set(arr));
}

function findChromeExecutables(folder: string) {
    const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
    const chromeExecRegex = '^Exec=\/.*\/(google-chrome|chrome|chromium)-.*';
    
    let installations = [];
    if (canAccess(folder)) {
        // Output of the grep & print looks like:
        //    /opt/google/chrome/google-chrome --profile-directory
        //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
        let execPaths;
        
        // Some systems do not support grep -R so fallback to -r.
        // See https://github.com/GoogleChrome/chrome-launcher/issues/46 for more context.
        try {
            execPaths = execSync(
                `grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, {stdio: 'pipe'});
        } catch (e) {
            execPaths = execSync(
                `grep -Er "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, {stdio: 'pipe'});
        }
        
        execPaths = execPaths.toString()
            .split(newLineRegex)
            .map((execPath: string) => execPath.replace(argumentsRegex, '$1'));
        
        execPaths.forEach((execPath: string) => canAccess(execPath) && installations.push(execPath));
    }
    
    return installations;
}

/** Returns the highest priority chrome installation. */
export function getChromeInstallations() {
    let platform = getPlatform();
    let executables = getChromeExecutablePaths(platform);
    
    if (executables) {
        return executables.map(path => ({platform, executablePath: path, browser: path.split('/').pop(), buildId: 'system'}));
    }
    
    return [];
}

function getChromeExecutablePaths(platform) {
    if (platform === 'linux') return linux();
    if (platform === 'darwin') return darwinFast();
    if (platform === 'wsl') return wsl();
    if (platform === 'win32') return win32();
    return null;
}

const {Cache} = require('@puppeteer/browsers');
import {homedir} from "os";

const browserCacheCWD = new Cache(path.join(process.cwd(), '.cache/puppeteer'));
const browserCacheHomedir = new Cache(path.join(homedir(), '.cache/puppeteer'));

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

// TODO add --browser={system|home|cwd} parameter
export const installedBrowsers = [
    ...checkInstalledBrowsers(browserCacheCWD.getInstalledBrowsers()).reverse(),
    ...checkInstalledBrowsers(browserCacheHomedir.getInstalledBrowsers()).reverse(),
    ...getChromeInstallations(),
];
