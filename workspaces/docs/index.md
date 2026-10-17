---
layout: home
title: Browser testing with native clients
hero:
  name: Puth
  text: Write native, repeatable and debuggable browser tests
  tagline: A realtime GUI, snapshots and Laravel integration. See every step of your test run and investigate failures from CI on your own machine.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Laravel integration
      link: /guide/laravel
---

<div class="puth-home">
<div class="puth-preview">

```php
use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class ExampleBrowserTest extends PuthTestCase
{
    public function test_visit_website()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('https://playground.puth.dev');
            $browser->assertSee('Puth');
        });
    }
}
```

<img src="/assets/image/puth-welcome.png" alt="Puth GUI showing browser test commands alongside the browser viewport">
</div>

<section class="puth-section">
<div>

## <span>Same</span> interfaces. <br>No learning curve.

Puth provides a replacement for Laravel Dusk. Install the Laravel integration, configure your PuthTestCase and move your existing browser tests over at your own pace.

[Start with Laravel →](/guide/laravel)

</div>
<img src="/assets/image/puth-code.png" alt="A Laravel browser test using Puth's familiar fluent API" loading="lazy">
</section>

<section class="puth-section replay">
<img src="/assets/image/snapshot-dd.gif" alt="Dragging an exported snapshot into the Puth GUI to inspect a recorded test" loading="lazy">
<div>

## Failing tests in CI/CD? <br><span>Replay</span> the test locally.

Snapshots capture the viewport, executed commands, console output and errors. Save failed test snapshots as CI artifacts, then drag and drop a snapshot into your local Puth GUI to see what went wrong.

[Set up CI and snapshots →](/guide/ci-cd)

</div>
</section>

<section class="puth-section">
<div>

## <span>Run</span> via Docker <br>or install locally.

Run Puth with npm, Docker or Podman. The server provides both the browser API and the web GUI, so your tests can connect to a local instance or a dedicated machine.

[Run your first Puth server →](/guide/getting-started#start-the-server)

</div>
<img src="/assets/image/puth-docker.png" alt="Starting a Puth server with Docker" loading="lazy">
</section>
</div>
