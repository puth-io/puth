#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

laravel=workspaces/clients/php/workspaces/laravel/tests/Browser
php=workspaces/clients/php/client/tests/Feature

cleanup() {
    rm -f "$laravel/McpDraftTest.php" "$laravel/McpBrokenDraftTest.php" "$php/McpDraftTest.php" "$php/McpBrokenDraftTest.php"
}
trap cleanup EXIT

run_laravel() {
    docker compose run --rm --no-deps -T laravel-test php artisan test --without-tty --cache-directory=/tmp/phpunit-cache --filter="$1"
}

run_php() {
    docker compose run --rm --no-deps -T php-test ./vendor/bin/phpunit --filter "$1"
}

docker compose run --rm --no-deps -T \
    -e PUTH_INSTANCE_URL=http://puth:7345 \
    -e PUTH_APP_URL=http://laravel:8080 \
    -e PUTH_FIXTURE_URL=http://fixtures:8081 \
    node-test node --import tsx dev/mcp/export-drafts.ts

# A draft only counts as verified after a real test runner passed it.
run_laravel McpDraftTest
run_php McpDraftTest

# A draft that can not fail would prove nothing.
if run_laravel McpBrokenDraftTest; then
    echo 'The Laravel draft with a wrong assertion passed.' >&2
    exit 1
fi
if run_php McpBrokenDraftTest; then
    echo 'The PHP draft with a wrong assertion passed.' >&2
    exit 1
fi

echo 'Drafts pass their test runners, and fail with a wrong assertion.'
