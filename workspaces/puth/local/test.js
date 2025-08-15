import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({channel: 'chrome', headless: false});
browser.on('disconnected', event => console.error(event));

// const page = await browser.newPage();

// const url = 'https://puth.io/';
// await page.goto(url);

let c2 = await browser.createBrowserContext();
let page2 = await c2.newPage();
let c3 = await browser.createBrowserContext();

console.log('closing c2');
await c2.close();
console.log('closed c2');
await c3.close();

// console.error(page.target());
// console.error(page2.browser().session);

// let cdp = await page.createCDPSession();
// let cdp2 = await page2.createCDPSession();

// console.error(await cdp.send('Browser.getWindowForTarget'));
// console.error(await cdp2.send('Browser.getWindowForTarget'));
