# Puth

[Puth](https://puth.io) is a nice browser testing tool with focus on stability, performance and extensive
feedback. Currently supported: PHP and Laravel.

Features:

- Native PHP & Laravel clients
- Replaying your tests
- Realtime web GUI
- See for yourself in the Screenshot. What you see can be automatically exported in your CI/CD if a test fails for example. Simply drag and drop the snapshot file into your locally running GUI

![GUI Preview](assets/gui-preview_2024-11.png)

Known problems:
- The preview in the GUI is slightly delayed, the actual delay depends on what function is called and on system performance. The slower the system, the bigger the potential delay. The problem being that the browser always renders after the DOM changes but Puth finishes the call when the DOM actions are done, not when the result of the actions are rendered.

## Important

Puth is a browser testing tool designed for development and CI/CD pipelines. Do **not** expose Puth to the internet, only run Puth with the least access needed. It comes with CORS out of the box but disabled in the Docker Image. The security risk with Puth has nothing to do with Puppeteer/Chrome but with Puth allowing calling **any** function and setting/getting any value that exists on remote objects (basically every object in a Puth Context that can be accessed via the API). Although this disclaimer might sound scary, this is true for most applications running on your system.

## Usage

You can run Puth either via docker image or via npm package (node >v24 and bun >1.2.19). Choose what fits best for your project/workflow.

### Docker

You can find Puth on [Dockerhub](https://hub.docker.com/r/puthio/puth). **Keep in mind** if you run Puth in a Docker
container you can access the hosts network via `host.docker.internal` (for linux add `--add-host=host.docker.internal:host-gateway`).

```bash
docker run -it --rm -p 127.0.0.1:7345:7345 puthio/puth:0.7.1
```

### npm

Install the `puth` npm package globally. On startup, it automatically downloads and caches the needed chrome installation either in your home directory or in the current working directory (don't worry it will prompt you so you can choose).

```bash
npm install --global puth
puth start
```

## Clients

### Laravel

Puth has a Laravel integration package. You can find more information in the [documentation](https://puth.io/docs/0_x/integrations/laravel).

### PHP

Puth has a client package for PHP. Currently undocumented.
