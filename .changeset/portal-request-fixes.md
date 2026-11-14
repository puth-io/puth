---
'puth': patch
'@puth/client-php': patch
---

Portal fixes:

- A detoured request, such as a multipart upload, reaches the client with its headers. They are sent as a plain object, without the `host` and `puth-portal-*` headers of the detour.
- Detours have their own listener on an ephemeral loopback port, and only that address counts as public in Chrome. Chrome no longer blocks a detour from a page that is not a secure context, while such pages still cannot reach the API, the websocket, or other local services.
- Laravel serves static files with the type of their extension, so Vite bundles that sniff as `text/x-java` load as JavaScript.
- Laravel sets `QUERY_STRING`, so `getQueryString()` and `fullUrl()` keep the query.
- Laravel passes the cookies of the browser to the application, parsed without changing their names. Cookies set by the test take precedence.
- Multipart names are nested like PHP does for `$_POST` and `$_FILES`, for example `files[0]` and `meta[a][b]`, and a subclass can override `parseMultipart()`.
- Binary request bodies reach the client byte for byte. They were read as text, which lost every byte that is not UTF-8. Multipart bodies with files from memory no longer need a detour; files from disk still take it.
