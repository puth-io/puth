---
'puth': patch
'@puth/client-php': patch
---

Portal fixes:

- A detoured request, such as a multipart upload, reaches the client with its headers. They are sent as a plain object, without the `host` and `puth-portal-*` headers of the detour.
- Chrome starts with `LocalNetworkAccessChecks` disabled, so it no longer blocks a detour to a loopback Puth instance from a page that is not a secure context.
- Laravel serves static files with the type of their extension, so Vite bundles that sniff as `text/x-java` load as JavaScript.
- Laravel sets `QUERY_STRING`, so `getQueryString()` and `fullUrl()` keep the query.
- Laravel passes the cookies of the browser to the application, parsed without changing their names. Cookies set by the test take precedence.
- Multipart names are nested like PHP does for `$_POST` and `$_FILES`, for example `files[0]` and `meta[a][b]`, and a subclass can override `parseMultipart()`.
