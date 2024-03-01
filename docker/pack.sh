#!/bin/bash

npm pack --workspace workspaces/core
npm pack --workspace workspaces/gui
npm pack --workspace workspaces/clients/js/client
npm pack --workspace workspaces/puth

rm puth-core-latest.tgz || true
rm puth-gui-latest.tgz || true
rm puth-client-latest.tgz || true
rm puth-latest.tgz || true

mv puth-core-*.tgz puth-core-latest.tgz
mv puth-gui-*.tgz puth-gui-latest.tgz
mv puth-client-*.tgz puth-client-latest.tgz
mv puth-[0-9]*.tgz puth-latest.tgz
