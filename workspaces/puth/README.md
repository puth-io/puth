# Puth

[Puth](https://puth.io) is a browser testing tool with a focus on stability, performance and extensive feedback.
Laravel and PHP are the main clients, with Java and TypeScript available.

- Native PHP and Laravel clients
- Replay of every test step in a realtime web GUI
- Snapshots of failed tests that you can open in the GUI, for example from CI
- MCP server for exploring applications and drafting tests with agents

![A snapshot of a failed test opened in the Puth GUI, with the failing step selected](https://puth.io/assets/image/puth-replay.png)

## Usage

Requires Node.js 24 or newer. On startup, Puth downloads and caches Chrome in your home directory or in the current
working directory, and asks you which one to use.

```bash
npm install --global puth
puth start
```

Puth is also available as a Docker image, [`ghcr.io/puth-io/puth`](https://github.com/puth-io/puth/pkgs/container/puth).

Read the [documentation](https://puth.io) for the clients, configuration and the GUI.

## Security

Puth is meant for development and CI/CD. Do **not** expose it to the internet, and run it with the least access
needed. Its API can call any function and read or write any value of the remote objects in a context.
