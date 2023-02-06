# Puth

[Puth](https://puth.dev) is a nice browser testing framework with focus on stability, performance and extensive feedback.

![GUI Preview](assets/gui-preview.png)

## Important

Puth is a browser testing tool designed for development and CI/CD pipelines. Do **not** expose Puth to the public.
The problem is not Puppeteer/Chrome, but Puth allows calling **any** function that exists on the remote object.

## Usage

Using Puth with docker is recommended. Puth default port is `7345`.

### Docker

You can find Puth on [Dockerhub](https://hub.docker.com/r/seuh/puth)

```bash
docker run -it --rm -p 127.0.0.1:7345:7345 seuh/puth:0.6.1
```

### npm

```bash
npm i --save-dev puth
```

To start a Puth Server
```bash
puth start
```

#### To start a Puth Server and instruct all Contexts to use a Daemon Browser
```bash
puth dev
```

To only run a Daemon
```bash
puth daemon
```

## Client

For client instruction, look at [Puth Javascript Client](https://puth.dev/docs/javascript)

## More information

For more information, visit [Puth Docs](https://puth.dev/docs/)