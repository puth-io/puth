# Setup

```bash
npm install
cd workspaces/puth && npm run dev:browser:install && cd -
```

# Development

## Docker Compose

Start the Puth server, GUI, and Laravel workspace without installing PHP, Composer, Java, Maven, or Chromium on the host:

```bash
docker compose up --build
```

- Puth server: http://localhost:7345
- Puth GUI (Vite with HMR): http://localhost:5173
- Laravel workspace: http://localhost:8000

Run tests only when needed:

```bash
docker compose exec laravel php artisan test --without-tty
docker compose --profile test run --rm java-test
```

Set `LOCAL_UID` and `LOCAL_GID` before the first build when your host user is not `1000:1000`, so Laravel can write its SQLite database and logs without creating root-owned files.

```bash
bun dev
```

## Puth Dev Server

```bash
bun run dev:server
```

## Puth Dev GUI

```bash
bun run dev:client
```

## PHP

### Laravel

```bash
cd workspaces/clients/php/workspaces/laravel/ && php artisan serve
```

### Java

Open `workspaces/clients/java/client` and `workspaces/clients/java/workspaces/spring` in your IDE and add client as a dependency for the spring project. Run the spring tests.
