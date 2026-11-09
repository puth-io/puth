#!/usr/bin/env bash

# Runs the remote API tests against a Puth image. The test and release workflows
# both use this script, so a release image is tested exactly like in pull requests.
#
# Usage: ./docker/test-image.sh <image>
# The container is named "puth" and stays after it stopped, for `docker logs puth`.

set -euo pipefail

image="${1:?Usage: $0 <image>}"

docker run --name=puth --detach --network host "$image"
trap 'docker stop puth > /dev/null' EXIT

timeout 10 bash -c 'until curl --output /dev/null --silent --fail http://127.0.0.1:7345; do printf "." && sleep 1; done'
echo

PUTH_URL=http://127.0.0.1:7345 npm run test:only:remote --workspace workspaces/puth
