# Getting started

::: warning Development and CI only
Puth exposes remote browser objects through its API. Keep the server restricted to your development environment or CI network; do not expose it to the internet.
:::

Run a Puth server, open its GUI, then connect your test client. For an overview of how these pieces fit together, see [What is Puth?](./what-is-puth).

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

## Connect a client

<SdkContent sdk="laravel">

Follow [Laravel setup](./laravel) to install `puth/laravel`, configure the server address and run your first `$this->browse()` test.

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

$context = new \Puth\Context('http://127.0.0.1:7345');
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

## Learn the Browser API

Once your first test runs, explore:

- [Browser basics](./browser-basics) for navigation, frames and page data.
- [Selectors and resolvers](./selectors-and-resolvers) for stable element lookup.
- [Interacting with elements](./interacting-with-elements) for forms and mouse input.
- [Waiting and sync](./waiting-and-sync) for asynchronous page changes.
- [Assertions](./assertions) for checking test results.

Moving existing tests? See [migrating from Dusk](./migration-from-dusk). For individual methods, use the [Browser](/api/browser) and [Context](/api/context) references.
