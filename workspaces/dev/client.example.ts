import RemotePuthClient from "@puth/client/RemotePuthClient";

const client = new RemotePuthClient("http://127.0.0.1:7345");

const func = (async function () {
  const context = await client.contextCreate({
    snapshot: true,
    test: {
      name: "Example Test",
    },
  });
  const browser = await context.createBrowser({
    defaultViewport: {
      height: 720,
      width: 1280,
    },
  });
  const page = (await browser.pages())[0];
  
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.visit('https://playground.puth.dev/');
  await page.$('body');
  await page.visit("https://playground.puth.dev");
  await page.visit("https://playground.puth.dev");
  await page.visit("https://playground.puth.dev");
  
  await context.testFailed();
  
  await context.exception({
    origin: "default",
    lang: "php",
    runner: "phpunit",
    exception: {
      message: "ArrayNotFound",
      code: 400,
      trace: [
        {
          file: "/test/bla.js",
          line: 8,
          function: null,
          args: [],
        },
        {
          file: "/test/root/bla.js",
          line: 7,
          function: "test",
          args: [],
        },
      ],
      files: [
        {
          path: "/test/bla.js",
          content:
              "" +
              "    /**\n" +
              "     * Sets up a Context, Browser and Page for every test.\n" +
              "     */\n" +
              "    protected function setUp(): void\n" +
              "    {\n" +
              "        parent::setUp();\n" +
              "\n" +
              "        $this->context = new Context($this->getPuthInstanceUrl(), [\n" +
              "            'snapshot' => $this->isSnapshot(),\n" +
              "            'test' => [\n" +
              "                'name' => $this->getName(),\n" +
              "            ],\n" +
              "            'group' => get_class($this),\n" +
              "            'dev' => $this->isDev(),\n" +
              "            'debug' => $this->isDebug(),\n" +
              "            'timeouts' => [\n" +
              "                'command' => $this->getTimeout(),\n" +
              "            ],\n" +
              "        ]);",
        },
        {
          path: ".env",
          content:
              "APP_NAME=Puth\n" +
              "APP_ENV=local\n" +
              "APP_KEY=base64:KR7P88xkoAppIuoL7vhOAwMov7pmQGqHkWLJwUKIYGM=\n" +
              "APP_DEBUG=true\n" +
              "APP_URL=http://localhost\n" +
              "LOG_CHANNEL=stack\n" +
              "LOG_DEPRECATIONS_CHANNEL=null\n" +
              "LOG_LEVEL=debug\n" +
              "DB_CONNECTION=mysql\n" +
              "DB_HOST=127.0.0.1\n" +
              "DB_PORT=3306\n" +
              "DB_DATABASE=laravel\n" +
              "DB_USERNAME=root\n" +
              "DB_PASSWORD=\n"
        },
      ],
    },
  });
  
  await context.destroy();
});

func();
