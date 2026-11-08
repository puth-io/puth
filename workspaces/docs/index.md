---
layout: home
title: Browser testing with native clients
---

<HomePage>
<template #laravel>

```php
public function test_visit_website()
{
    $this->browse(function (Browser $browser) {
        $browser->visit('https://playground.puth.dev')
            ->assertSee('Puth');
    });
}
```

</template>
<template #spring>

```java
@SpringBootTest
@AutoConfigureMockMvc
class HomePageTest {
    @Autowired
    MockMvc mockMvc;

    @RegisterExtension
    PuthPortalExtension puth = PuthPortalExtension.forMockMvc(
        () -> "http://127.0.0.1:7345", Map::of, () -> mockMvc);

    @Test
    void shows_home(Browser browser) {
        browser.visit("http://localhost")
            .assertSee("Puth");
    }
}
```

</template>
<template #php>

```php
$context = \Puth\Context::create('http://127.0.0.1:7345');
$browser = $context->createBrowserShim();

$browser->visit('https://playground.puth.dev');
echo $browser->text('body');
```

</template>
<template #java>

```java
Context context = Context.create("http://127.0.0.1:7345");
Browser browser = context.createBrowserShim();

browser.visit("https://playground.puth.dev")
    .assertSee("Puth");
```

</template>
<template #js>

```ts
import { Context } from '@puth/client';

const context = await Context.create('http://127.0.0.1:7345');
const browser = await context.createBrowserShim();

await browser.visit('https://playground.puth.dev');
await browser.assertSee('Puth');
```

</template>
</HomePage>
