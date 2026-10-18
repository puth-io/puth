# Running tests with Compose

Run commands from the repository root. Docker Engine and Docker Compose are the
only host prerequisites; Node, Chrome libraries, PHP, Composer, and Maven run in
containers. On Linux, if your user/group IDs differ from 1000, export `LOCAL_UID`
and `LOCAL_GID` with the output of `id -u` and `id -g` before building.

## Full run

```sh
./docker/dev/test.sh
```

The script builds the development images, waits for Puth and Laravel, and runs
each active suite in order. It stops at the first failure and returns a nonzero
exit status. Services stay running for investigation or another focused run.

The `setup` service installs the root lockfile with `npm ci`, builds the published
packages, and downloads the Chrome version required by Puppeteer. The Laravel
entrypoint installs its Composer and frontend dependencies, builds its assets,
creates `.env` from `.env.example` if absent, and migrates SQLite. Compose supplies
the container URLs and database path, overriding host-specific `.env` values.
The source checkout and builds are bind-mounted, so source edits are visible
immediately. Node dependencies and npm/Maven caches use named volumes to keep
container dependencies separate from host installations. Laravel screenshots,
console logs, and page sources use shared named volumes to preserve existing
host artifacts and avoid permission conflicts; PHPUnit's cache is temporary.

This runs the active Node, docs, PHP client, Java client, and Laravel suites. It
does not reproduce CI's PHP/Laravel version matrix or Docker release-image smoke
tests. The Spring example is currently excluded from CI and from this runner.

## Individual suites

Prepare the environment once:

```sh
docker compose up --build --wait puth laravel
docker compose --profile test build
```

Then run any suite without restarting setup or its dependencies:

| Service | Suite | Command |
| --- | --- | --- |
| `node-test` | Puth unit and browser tests | `docker compose run --rm --no-deps node-test` |
| `docs-test` | Documentation tests | `docker compose run --rm --no-deps docs-test` |
| `php-test` | Standalone PHP client | `docker compose run --rm --no-deps php-test` |
| `java-test` | Java client | `docker compose run --rm --no-deps java-test` |
| `laravel-test` | Laravel unit and browser tests | `docker compose run --rm --no-deps laravel-test` |

Focused Node and Laravel examples:

```sh
docker compose run --rm --no-deps node-test npm -w puth run test -- test/utils/portal-detour-response.test.ts
docker compose run --rm --no-deps laravel-test php artisan test --without-tty --cache-directory=/tmp/phpunit-cache --filter=PortalTest
docker compose run --rm --no-deps java-test mvn --batch-mode --no-transfer-progress -Dtest=InteractsWithElementsTest test
```

The Node suite creates its own local and HTTP servers. Java and Laravel connect
to `http://puth:7345`. The standalone PHP test case currently hardcodes
`127.0.0.1:7345`, so `php-test` shares Puth's network namespace.

## Failures and cleanup

```sh
docker compose logs --tail=100 setup puth laravel
docker compose ps --all
docker compose config --quiet
docker compose down
```

Copy Laravel browser artifacts out of the running service when needed:

```sh
docker compose cp laravel:/workspace/workspaces/clients/php/workspaces/laravel/tests/Browser/console /tmp/puth-console
docker compose cp laravel:/workspace/workspaces/clients/php/workspaces/laravel/tests/Browser/screenshots /tmp/puth-screenshots
docker compose cp laravel:/workspace/workspaces/clients/php/workspaces/laravel/tests/Browser/source /tmp/puth-source
```

Browser suites use `https://playground.puth.dev` and `https://puth.io`. Image
builds and dependency installation also need access to the configured Docker,
Debian, npm, Composer, Maven, and Chrome-download hosts. If sandbox network
policies block a required host, allow that host before rerunning. Treat missing page
elements and certificate errors as possible environment failures first; do not
disable TLS checks or skip tests to obtain a green run.

For a fresh dependency install after lockfile changes, stop the services and run
setup again through the normal startup command. `docker compose down` preserves
the checkout and Maven cache; avoid `down --volumes` unless deleting caches is
intentional. Do not delete or overwrite unrelated existing test artifacts to
work around permission errors.
