---
'puth': minor
'@puth/mcp': patch
---

Puth uses Puppeteer 25 and Chrome 157. `puth browser install` unpacks Chrome without the `unzip` command, and it installs again when an earlier download left an incomplete folder behind. Downloads through an HTTP proxy need the optional `proxy-agent` package now. The other dependencies of both packages are updated, among them h3 2.0 and zod 4.
