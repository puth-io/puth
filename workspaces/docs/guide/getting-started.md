# Getting started

[Puth](https://puth.io) is a browser testing tool focused on stability, performance, and detailed feedback. A Puth server runs the browser; your test client connects to that server.

## Start the server

Choose npm or Docker to run Puth.

### npm

Use Node.js 24 or newer:

```sh
npm install --global puth
puth start
```

On startup, Puth downloads and caches the required Chrome installation if needed. Follow the prompt to choose its location.

### Docker

```sh
docker run -it --rm -p 127.0.0.1:7345:7345 puthio/puth:0.7.1
```

When a browser running in Docker needs to reach an application on your host, use `host.docker.internal`. On Linux, add `--add-host=host.docker.internal:host-gateway` to the Docker command.

## Open the GUI

Visit `http://localhost:7345` while the server is running. The GUI shows browser activity and can open exported snapshot files by drag and drop.

## Connect a client

For Laravel applications, follow the [Laravel integration guide](./laravel). The standalone PHP client is available as [`puth/php`](https://packagist.org/packages/puth/php).

::: warning Development and CI only
Puth exposes remote browser objects through its API. Keep the server restricted to your development environment or CI network; do not expose it to the internet.
:::
