#!/usr/bin/env node

const fs = require("fs");

let args = process.argv.slice(2, process.argv.length);

if (args.length !== 2) {
  console.log("Not enough args");
  process.exit(1);
}

if (args[0] === "version") {
  makeRelease(args[1]);
}

function makeRelease(version) {
  // Update php/laravel
  let composer = JSON.parse(
    fs.readFileSync("workspaces/clients/php/laravel/composer.json", "utf8")
  );

  composer.require["puth/php"] = version;
  delete composer.repositories;

  fs.writeFileSync(
    "workspaces/clients/php/laravel/composer.json",
    JSON.stringify(composer, null, 4)
  );
}
