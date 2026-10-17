# Portal and detours

Portal intercepts browser requests and sends them to the connected client for handling. Configure matching URLs per context through `supports.portal.urlPrefixes`. Requests that do not match a prefix continue normally.

## Context options

| Option | Default | Behavior |
| --- | --- | --- |
| `portal` | `true` | Enables portal interception for the context. When disabled, no CDP Fetch interception is installed. |
| `detour` | `true` | Allows fallback through `/portal/detour` when a portal request body cannot be read directly, such as an oversized or multipart body. |

Setting `detour` to `false` keeps normal portal handling enabled while preventing the fallback route.

## Change settings after creation

Contexts expose these methods:

- `enablePortal()`
- `disablePortal()`
- `enableDetour()`
- `disableDetour()`

## Laravel defaults

The Laravel test client creates contexts with both `portal` and `detour` set to `false`. Use the [PuthEnablePortal trait](./laravel#portal) to enable both. Values returned by `getContextOptions()` override the defaults individually.
