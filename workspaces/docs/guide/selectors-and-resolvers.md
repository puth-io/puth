---
title: Selectors and resolvers
description: How Puth resolves selectors before querying the page.
---

# Selectors and resolvers

Selectors are CSS by default. High-level lookups such as `$browser->click()`, `$browser->find()` and `$browser->waitForTextIn()` use the resolver so you can keep tests tidy and stable. Some low-level waits accept raw CSS instead; see [waiting and sync](./waiting-and-sync).

## Resolver basics

- Default prefix: `body` (selectors are scoped under body).
- Default finder: `puth` (used by `@` shortcuts).

Add a stable attribute to your application markup:

```html
<button puth="save">Save changes</button>
```

`@name` expands to `[puth="name"]`, so the test does not depend on layout classes or button wording.

```php
$browser->click('@save');
// resolves to: body [puth="save"]
```

## Prefix and page elements

You can change the prefix and define reusable selectors:

```php
$browser->setResolverPrefix('#app');
$browser->setResolverPageElements([
        '@nav' => 'nav[role="navigation"]',
        '@save' => 'button[type="submit"]',
    ]);
$browser->click('@save');
```

## Special cases

- `xpath//...` uses XPath selectors.
- Selectors ending with `[]` are invalid.
- When running on Bun, XPath is only supported on the root document.

## Finder helpers

- `$browser->resolver(selector)` returns the resolved selector string.
- `$browser->find(selector)` waits for a match and returns it; a timeout can throw. Hidden-element wait options can return null.
- `$browser->findAll(selector)` returns all matches.
- `$browser->_findOrFail(selector)` returns all matches or throws.
- `$browser->_firstOrFail(selector)` returns the first match or throws.

Use [browser basics](./browser-basics) for frame scoping and the [Browser reference](/api/browser) for the selected client’s methods. Laravel page and component wrappers are described under [Laravel integration](./laravel).
