# Setup

```bash
npm install
cd workspaces/puth && bun run dev:browser:install && cd -
```

# Development

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
