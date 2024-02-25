#!/bin/bash

npm pack --workspace workspaces/core
npm pack --workspace workspaces/gui
npm pack --workspace workspaces/clients/js/client
npm pack --workspace workspaces/puth

rm puth-core-latest.tgz
rm puth-gui-latest.tgz
rm puth-client-latest.tgz
rm puth-latest.tgz

mv puth-core-*.tgz puth-core-latest.tgz
mv puth-gui-*.tgz puth-gui-latest.tgz
mv puth-client-*.tgz puth-client-latest.tgz
mv puth-[0-9]*.tgz puth-latest.tgz
