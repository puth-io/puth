#!/usr/bin/env node
const fs = require("node:fs");
const path = require("path");

const pkgPath = path.join(process.cwd(), 'package.json');

const pkg = require(pkgPath);
delete pkg.devDependencies;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), {encoding: 'utf8', flag: 'w'});
