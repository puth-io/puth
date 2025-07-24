// import puppeteer from 'puppeteer';
import puppeteer from 'puppeteer-core';
import path from 'node:path';
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page
const browser = await puppeteer.launch({channel: 'chrome', headless: false});
const page = await browser.newPage();

let cdp = await page.createCDPSession();

const url = 'https://puth.io/';

await cdp.on('Fetch.requestPaused', ({requestId, request}) => {
    if (request.url !== url) {
        return cdp.send('Fetch.continueRequest', {requestId});
    }

    console.debug({ request });

    request.postDataEntries.forEach(entry => {
        if (entry?.bytes == null) return;
        console.debug(atob(entry?.bytes));
    })

    return cdp.send('Fetch.continueRequest', {
        requestId,
        url: 'http://127.0.0.1/',
    });
});
await cdp.send('Fetch.enable');

// await page.setBypassCSP(false);

await page.setContent(
    '<html><body>' +
    `        <form action="${url}" method="post" enctype="multipart/form-data">` +
    '            <input type="file" name="form-single">' +
    '            <button>submit</button>' +
    '        </form>' +
    '    </body></html>'
);
let el = await page.$('[name="form-single"]');
await el.uploadFile(path.join(__dirname, 'test.txt'));
await page.click('button');

// await page.click('button');

// await page.setContent(
//     '<html><body>' +
//     '        <form action="http://127.0.0.1:8000/" method="post">' +
//     '            <input type="text" name="form-single" value="1234">' +
//     '            <button>submit</button>' +
//     '        </form>' +
//     '    </body></html>'
// );
// await page.click('button');

// await browser.close();

//     $browser
//         ->attach('form-single', __DIR__ . '/files/test.txt')
//         ->attach('form-multiple', [
//             __DIR__ . '/files/test.txt',
//             __DIR__ . '/files/test2.txt',
//         ])

async function rewrite() {
    const url = 'https://developer.chrome.com/';

    await cdp.on('Fetch.requestPaused', ({requestId, request}) => {
        if (request.url !== url) {
            return cdp.send('Fetch.continueRequest', {requestId});
        }

        return cdp.send('Fetch.continueRequest', {
            requestId,
            url: 'https://www.google.com',
        });
    });
    await cdp.send('Fetch.enable');

    await page.setBypassCSP(false);
    await page.goto(url);
}
