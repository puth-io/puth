#!/usr/bin/env node
// Fails the publish of the package in the current directory if a file its package.json points to is missing.
// `npm run release` builds every package once before `changeset publish`, which publishes them concurrently. A package
// that rebuilt itself or another one here could empty a dist directory while it is packed.
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const entries = new Set();
const collect = (value) => {
    if (typeof value === 'string') {
        entries.add(value);
    } else if (value && typeof value === 'object') {
        Object.values(value).forEach(collect);
    }
};
[pkg.main, pkg.module, pkg.types, pkg.exports, pkg.bin].forEach(collect);
(pkg.files ?? []).filter((file) => file.replace(/\/$/, '') === 'dist').forEach(() => entries.add('dist/'));

const missing = [...entries].filter((entry) => {
    if (! fs.existsSync(entry)) {
        return true;
    }
    return fs.statSync(entry).isDirectory() && fs.readdirSync(entry).length === 0;
});

if (missing.length > 0) {
    console.error(`${pkg.name}: missing ${missing.join(', ')}. Run \`npm run build\` at the repository root first.`);
    process.exit(1);
}
