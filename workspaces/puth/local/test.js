import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({channel: 'chrome', headless: false});
const page = await browser.newPage();

const url = 'https://puth.io/';
await page.goto(url);

let c2 = await browser.createBrowserContext();
let page2 = await c2.newPage();

await page2.goto(url);

// console.error(page.target());
// console.error(page2.browser().session);

let cdp = await page.createCDPSession();
let cdp2 = await page2.createCDPSession();

console.error(await cdp.send('Browser.getWindowForTarget'));
console.error(await cdp2.send('Browser.getWindowForTarget'));
