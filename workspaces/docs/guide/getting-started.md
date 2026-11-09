---
sdks: [spring, java, js]
---

# Getting started

::: warning Development and CI only
Puth exposes remote browser objects through its API. Keep the server restricted to your development environment or CI network; do not expose it to the internet.
:::

Run a Puth server, open its GUI, then connect your test client. For an overview of how these pieces fit together, see [What is Puth?](./what-is-puth).

<div class="steps">

## Start the server

Choose npm or Docker to run Puth.

### npm

Use Node.js 24 or newer:

```sh
npm install --global puth
puth start
```

On startup, Puth downloads and caches the required Chrome installation if needed. Follow the prompt to choose its location.

Puth checks `~/.cache/puth` and `.cache/puppeteer` relative to the server's working directory. Using the home directory cache avoids downloading separate copies for each project.

### Docker

```sh
docker run -it --rm -p 127.0.0.1:7345:7345 puthio/puth:0.7.1
```

When a browser running in Docker needs to reach an application on your host, use `host.docker.internal`. On Linux, add `--add-host=host.docker.internal:host-gateway` to the Docker command.

### Docker Compose

The OCI image includes Chrome and can also run with Podman. To start it alongside your development services:

```yaml
services:
  puth:
    image: puthio/puth:0.7.1
    ports:
      - '127.0.0.1:7345:7345'
    volumes:
      - ./puth/snapshots:/puth/storage/snapshots
```

The volume preserves snapshots from the container so you can keep them as [CI artifacts](./ci-cd). Configure your client with the server address it can reach: `http://127.0.0.1:7345` from your host, or `http://puth:7345` from another service on the same Compose network.

## Open the GUI

Visit `http://localhost:7345` while the server is running. The GUI shows browser activity and can open exported snapshot files by drag and drop.

![The Puth GUI with a failed test: its steps on the left, the page at the failing step on the right](/assets/image/puth-welcome.png)

Each test lists its steps, split into the pages they ran on. Hover a step to see the page at that moment, click it to keep it, and switch between the page before and after it. Console output and requests sit collapsed under the step that caused them, and a failed test starts with a summary that leads to the failing step.

## Connect a client

<SdkContent sdk="laravel">

Follow [Laravel setup](./laravel) to install `puth/laravel`, configure the server address and run your first `$this->browse()` test.

</SdkContent>

<SdkContent sdk="spring">

Follow [Spring Boot integration](./spring-boot) to install the Java client, register `PuthPortalExtension` on a `@SpringBootTest` and run your first test with `mvn test`.

</SdkContent>

<SdkContent sdk="php">

The standalone PHP client is in development. Its current assertion metadata handling expects a bound Laravel test case, so this standalone example checks a returned value with ordinary PHP. Generated assertion methods are listed in the reference, but are not yet safe to use without that binding.

Install the standalone client in your PHP project:

```sh
composer require --dev puth/php
```

Create a context, then a Browser shim. Use absolute application URLs with the standalone client:

```php
require 'vendor/autoload.php';

$context = \Puth\Context::create('http://127.0.0.1:7345');
try {
    $browser = $context->createBrowserShim();
    $browser->visit('https://playground.puth.dev');
    if (!str_contains($browser->text('body'), 'Puth')) {
        throw new \RuntimeException('Expected Puth on the page.');
    }
} finally {
    $context->destroy(['immediately' => true]);
}
```

`$context->destroy()` releases the context and its browsers. Standalone clients manage their own lifecycle; there is no Laravel test case to clean up automatically.

</SdkContent>

<SdkContent sdk="java">

The Java client is not published to Maven Central yet. Install it from a checkout of the Puth repository and add it to your test dependencies, as described in [Install the Java client](./spring-boot#install-the-java-client).

Create a context, then a Browser shim. Calls return the Browser, so they chain, and assertions throw when they fail:

```java
import io.puth.client.Context;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;

class ExampleTest {
    @Test
    void shows_puth() {
        Context context = Context.create("http://127.0.0.1:7345");
        try {
            Browser browser = context.createBrowserShim();
            browser.visit("https://playground.puth.dev")
                .assertSee("Puth");
        } finally {
            context.destroy();
        }
    }
}
```

`context.destroy()` releases the context and its browsers. For Spring Boot applications, the [Spring Boot integration](./spring-boot) creates and destroys contexts for you.

</SdkContent>

<SdkContent sdk="js">

Install the client in your project:

```sh
npm install --save-dev @puth/client
```

Create a context, then a Browser shim. Every call returns a promise, and assertions reject when they fail. This works with any test runner:

```ts
import { Context } from '@puth/client';

const context = await Context.create('http://127.0.0.1:7345');
try {
    const browser = await context.createBrowserShim();
    await browser.visit('https://playground.puth.dev');
    await browser.assertSee('Puth');
} finally {
    await context.destroy({ immediately: true });
}
```

`context.destroy()` releases the context and its browsers.

</SdkContent>

</div>

## Learn the Browser API

Once your first test runs, explore:

- [Browser basics](./browser-basics) for navigation, frames and page data.
- [Selectors and resolvers](./selectors-and-resolvers) for stable element lookup.
- [Interacting with elements](./interacting-with-elements) for forms and mouse input.
- [Waiting and sync](./waiting-and-sync) for asynchronous page changes.
- [Assertions](./assertions) for checking test results.

Moving existing tests? See [migrating from Dusk](./migration-from-dusk). For individual methods, use the [Browser](/api/browser) and [Context](/api/context) references.
