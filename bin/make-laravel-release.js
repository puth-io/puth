#!/usr/bin/env node

import fs from 'node:fs';

let args = process.argv.slice(2, process.argv.length);
if (args.length !== 1) {
  console.log("Not enough args");
  process.exit(1);
}

let version = '';
if (args[0] === 'version-from-package') {
    let pkg = JSON.parse(fs.readFileSync('workspaces/clients/php/laravel/package.json', 'utf8'));
    version = pkg['dependencies']['@puth/client-php'];
} else {
    version = args[0];
}

let composer = JSON.parse(fs.readFileSync('workspaces/clients/php/laravel/composer.json', 'utf8'));

composer.require['puth/php'] = version;
delete composer.repositories;

fs.writeFileSync(
    'workspaces/clients/php/laravel/composer.json',
    JSON.stringify(composer, null, 4) + "\n",
);
