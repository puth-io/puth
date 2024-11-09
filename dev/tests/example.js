import {RemotePuthClient} from '@puth/client/lib/RemotePuthClient';
import {sleep} from 'puth/lib/Utils';

let base = process.argv[2] ?? process.env.PUTH_URL;
if (!base.startsWith('http')) {
    base = 'http://' + base;
}
const client = new RemotePuthClient(base);

let context = null;
process.on('SIGINT', async () => {
    await context.destroy();
    process.exit();
});

async function laravel() {
    context = await client.contextCreate({
        snapshot: true,
        test: {
            name: 'Example Test',
        },
        timeout: 2000,
    });
    const browser = await context.createBrowser({
        defaultViewport: {
            height: 720,
            width: 1280,
        },
    });
    const page = (await browser.pages())[0];
    
    await page.setViewport({
        width: 1280,
        height: 720,
    });
    
    // TODO $browser->maximize() mit CDP
    // TODO $browser->move() mit CDP
    // TODO docs "Dialog handling"
    
    await page.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'dark'}]);
    // await page.visit('https://puth-web-preview-1.fly.dev/');
    await page.visit('https://playground.puth.dev');
    // await page.$('body');
    // for (let i = 0; i < 25; i++) {
    //     await page.$('body');
    // }
    // for (let i = 0; i < 10; i++) {
    //     await sleep(500);
    //     await page.$('body');
    // }
    
    // await page.$('body');
    // await page.$('body');
    // await page.$('body');
    // await page.visit('https://laravel.com/');
    // await page.$('body');
    
    // const start_time = process.hrtime();
    // console.log('test', process.hrtime(start_time));
    // for (let i = 0; i < 150; i++) {
    //   await page.$('body');
    // }
    // console.log('took', process.hrtime(start_time));
    
    // await context.testFailed();
    
    // await context.exception({
    //     origin: "default",
    //     lang: "php",
    //     runner: "phpunit",
    //     exception: {
    //         message: "ArrayNotFound",
    //         code: 400,
    //         trace: [
    //             {
    //                 file: "/test/bla.js",
    //                 line: 8,
    //                 function: null,
    //                 args: [],
    //             },
    //             {
    //                 file: "/test/root/bla.js",
    //                 line: 7,
    //                 function: "test",
    //                 args: [],
    //             },
    //         ],
    //         files: [
    //             {
    //                 path: "/test/bla.js",
    //                 content:
    //                     "" +
    //                     "    /**\n" +
    //                     "     * Sets up a Context, Browser and Page for every test.\n" +
    //                     "     */\n" +
    //                     "    protected function setUp(): void\n" +
    //                     "    {\n" +
    //                     "        parent::setUp();\n" +
    //                     "\n" +
    //                     "        $this->context = new Context($this->getPuthInstanceUrl(), [\n" +
    //                     "            'snapshot' => $this->isSnapshot(),\n" +
    //                     "            'test' => [\n" +
    //                     "                'name' => $this->getName(),\n" +
    //                     "            ],\n" +
    //                     "            'group' => get_class($this),\n" +
    //                     "            'dev' => $this->isDev(),\n" +
    //                     "            'debug' => $this->isDebug(),\n" +
    //                     "            'timeouts' => [\n" +
    //                     "                'command' => $this->getTimeout(),\n" +
    //                     "            ],\n" +
    //                     "        ]);",
    //             },
    //         ],
    //     },
    // });
    
    // await context.destroy({save: {to: 'file'}});
    await context.destroy();
}

await laravel();
