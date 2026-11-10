---
title: Client support
description: What each client supports and how it is tested.
sdks: [java, js]
---

# Client support

This matrix reflects what the test suites cover. Every client talks to the same server and shares its browser behavior, because `Context` and `Browser` are generated from the server source for PHP, Java and TypeScript.

| | Laravel | PHP | Java | JavaScript/TypeScript |
| --- | --- | --- | --- | --- |
| Package | `puth/php` | `puth/php` | `io.puth` client | `@puth/client` |
| Readiness | Primary | Supported | Beta | Beta |
| Generated `Browser` and `Context` | Yes | Yes | Yes | Yes |
| Browser suite | 80 tests | 19 tests | 45 tests | Runs in Puth's suite, including its GUI tests |
| Tested in CI with | PHP 8.2 to 8.5, Laravel 12 and 13 | PHP 8.2 to 8.4 | Java 17 | Node 24 |
| Portal | Tested end to end | Not supported | Tested end to end with Spring Boot | Not supported |
| MCP test drafts | Run by real test runner | Run by real test runner | Not available | Not available |
| Documentation | Complete | Partial | Minimal | Minimal |

- **Primary** means the most complete integration, with the Dusk-style API and portal support.
- **Beta** means the API works and is tested, but it has fewer conveniences. The Spring Boot integration for Java is tested in CI through the example application, with MockMvc and with a running server.
