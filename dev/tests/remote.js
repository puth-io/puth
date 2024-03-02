const {RemotePuthClient} = require('@puth/client/lib/RemotePuthClient');

let base = process.env.PUTH_URL ?? process.argv[2];
if (!base.startsWith('http')) {
    base = 'http://' + base;
}
const remote = new RemotePuthClient(base);

const queue = [];
let exit = 0;

async function execute(name, callback, raw = false) {
    const context = await remote.contextCreate({
        snapshot: true,
        test: {name},
    })
    
    let browser = null;
    let page = null;
    if (!raw) {
        browser = await context.createBrowser();
        page = (await browser.pages())[0];
    }
    
    try {
        await callback({context, browser, page});
        console.log('✓', name);
    } catch (error) {
        console.log(' ', name);
        exit = 1;
    } finally {
        await context.destroy()
    }
}
function test(...parameters) {
    queue.push([...parameters]);
}
async function run() {
    for (let i = 0; i < queue.length; i++) {
        await execute(queue[i][0], queue[i][1]);
    }
}

function error_until(value) {
    if (value) {
        return;
    }
    
    throw new Error('assert failed');
}

test('context create', ({context}) => {
    let rep = context.representation;
    error_until('id' in rep && 'type' in rep);
}, true);

test('context basics', async ({page}) => {
    await page.visit('https://playground.puth.dev');
    
    error_until(await page.url() === 'https://playground.puth.dev/');
    
    error_until(await page.$('#properties-value input').value() === 'input with value');
    error_until(await page.$('#properties-innertext').innerText() === 'div with this innertext');
    
    await page.$('#actions-click button').click();
    error_until(await page.$('#actions-click-verify').innerText() === 'clicked button');
});

run().then(_ => process.exit(exit));
