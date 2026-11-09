---
sdks: [java, spring, js]
---

# Portal and detours

Portal intercepts browser requests and sends them to the connected client for handling. Configure matching URLs per context through `supports.portal.urlPrefixes`. Requests that do not match a prefix continue normally.

## Context options

| Option | Server default | Behavior |
| --- | --- | --- |
| `portal` | `true` | Enables portal interception for the context. When disabled, no CDP Fetch interception is installed. |
| `detour` | `true` | Allows fallback through `/portal/detour` when a portal request body cannot be read directly, such as an oversized or multipart body. |

Setting `detour` to `false` keeps normal portal handling enabled while preventing the fallback route.

Both options are set when the context is created and cannot be changed afterwards. URL prefix matching applies while portal is enabled.

## Client defaults

<SdkContent sdk="laravel">

The Laravel test case creates contexts with portal and detours disabled. Use `$this->context` to access its context. See [Laravel portal setup](./laravel#portal) for the enabling trait and option overrides.

</SdkContent>

<SdkContent sdk="php">

Standalone contexts enable portal and detours by default. Configure matching prefixes when creating the context:

```php
$context = \Puth\Context::create('http://127.0.0.1:7345', [
    'supports' => ['portal' => ['urlPrefixes' => ['https://app.test/']]],
]);
```

Portal forwards matching requests to the client, so use it only when your client has a request handler configured. A standalone context is not a Laravel application request handler.

</SdkContent>

<SdkContent sdk="java">

Portal needs a client that answers the forwarded requests. For a Spring Boot application, `PuthPortalExtension` answers them through MockMvc and configures the prefixes; see the [Spring Boot integration](./spring-boot#register-the-extension). A plain Java context has no request handler, so leave its URL prefixes empty.

</SdkContent>

<SdkContent sdk="spring">

`PuthPortalExtension` creates contexts with portal enabled, answers matching requests through MockMvc and lets all other requests load normally. See [Register the extension](./spring-boot#register-the-extension) for the prefixes and options.

</SdkContent>

<SdkContent sdk="js">

The Node.js client cannot answer portal requests yet. Leave the URL prefixes empty, so every request loads normally from the application.

</SdkContent>
