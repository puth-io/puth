# Portal and detours

Portal intercepts browser requests and sends them to the connected client for handling. Configure matching URLs per context through `supports.portal.urlPrefixes`. Requests that do not match a prefix continue normally.

## Context options

| Option | Server default | Behavior |
| --- | --- | --- |
| `portal` | `true` | Enables portal interception for the context. When disabled, no CDP Fetch interception is installed. |
| `detour` | `true` | Allows fallback through `/portal/detour` when a portal request body cannot be read directly, such as an oversized or multipart body. |

Setting `detour` to `false` keeps normal portal handling enabled while preventing the fallback route.

## Change settings after creation

Contexts expose these methods:

- `$context->enablePortal()`
- `$context->disablePortal()`
- `$context->enableDetour()`
- `$context->disableDetour()`

For example:

```php
$context->enablePortal();
$context->disableDetour();
```

URL prefix matching still applies after portal is enabled.

## Client defaults

<SdkContent sdk="laravel">

The Laravel test case creates contexts with portal and detours disabled. Use `$this->context` to access its context. See [Laravel portal setup](./laravel#portal) for the enabling trait and option overrides.

</SdkContent>

<SdkContent sdk="php">

Standalone contexts enable portal and detours by default. Configure matching prefixes when creating the context:

```php
$context = new \Puth\Context('http://127.0.0.1:7345', [
    'supports' => ['portal' => ['urlPrefixes' => ['https://app.test/']]],
]);
```

Portal forwards matching requests to the client, so use it only when your client has a request handler configured. A standalone context is not a Laravel application request handler.

</SdkContent>
