import {RemotePuthClient} from '@puth/client';

const client = new RemotePuthClient('http://127.0.0.1:7345/', {debug: true});
let context = null;
process.on('SIGINT', async () => {
    await context?.destroy();
    process.exit();
});
context = await client.contextCreate({
    snapshot: true,
    test: {
        name: 'Example Test',
    },
    timeout: 2000,
});
let browser = await context.createBrowser({
    defaultViewport: {
        height: 720,
        width: 1280,
    },
});
let page = (await browser.pages())[0];
let wrapper = await context.createBrowserWrapper(await page.getRepresentation(), 'https://puth.io');

await wrapper.visit('https://puth.io/')
    .assertSeeIn('body', 'Puth');

console.log(await wrapper.setBaseUrl('http://playground.puth.io'));
console.log(await wrapper.getBaseUrl());
