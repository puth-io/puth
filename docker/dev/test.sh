#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

# Stop on the first failure, keeping each runner's exit status and output.
docker compose --profile test build
docker compose up --wait puth laravel
for suite in node-test docs-test php-test java-test laravel-test; do
    docker compose run --rm --no-deps "$suite"
done
