#!/bin/sh
set -eu

# Docker creates empty dependency volumes as root; builds run as the host UID.
for directory in node_modules workspaces/puth/node_modules workspaces/gui/node_modules workspaces/docs/node_modules /tmp/npm-cache; do
    mkdir -p "$directory"
    chown -R node:node "$directory"
done

exec su -s /bin/sh node -c 'npm ci --no-audit --no-fund && npm run build && npm -w puth run ci:browser:install'
