<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { useSdkState } from '../sdk';
import { client, clients, type Sdk } from '../../lib/sdk';

const { preferred, select } = useSdkState();
const current = computed(() => client(preferred.value));
const files: Record<Sdk, string> = {
  laravel: 'tests/Browser/ExampleTest.php',
  spring: 'src/test/java/HomePageTest.java',
  php: 'tests/ExampleTest.php',
  java: 'src/test/java/ExampleTest.java',
  js: 'tests/example.test.ts',
};
const steps = computed(() => [
  { title: 'Start the server', command: 'docker run -it --rm -p 127.0.0.1:7345:7345 puthio/puth:0.7.1' },
  { title: `Install the ${current.value.label} client`, command: current.value.install },
  { title: 'Open the GUI, run your tests', command: current.value.run },
]);
const features = [
  { title: 'Same interfaces', text: 'A drop-in replacement for Laravel Dusk. Move tests over at your own pace.', icon: 'm8 9-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12' },
  { title: 'Replay from CI', text: 'Snapshots record the viewport, commands, console output and errors.', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2' },
  { title: 'Flake resistant', text: 'Assertions retry, actions wait for their target, calls pause while pages load.', icon: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5' },
  { title: 'Built for agents', text: 'An MCP server lets coding agents explore your app and export test drafts.', icon: 'M8 7h8a4 4 0 0 1 4 4v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a4 4 0 0 1 4-4ZM12 3v4M9.5 13h.01M14.5 13h.01' },
];
const image = (name: string) => withBase(`/assets/image/${name}`);
</script>

<template>
  <div class="puth-home">
    <section class="hero puth-dither puth-dither-strong">
      <div class="hero-windows" aria-hidden="true"><span /><span /></div>
      <div class="hero-body">
        <h1>Browser tests you can see.<br>Failures you can understand.</h1>
        <p>
          Write native, repeatable browser tests. Watch every step in a realtime GUI, and replay failures from CI on
          your own machine. <a href="/guide/migration-from-dusk">Migrating from Dusk?</a>
        </p>
        <a class="cta" href="/guide/getting-started">
          Get started
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
      <div class="hero-command"><span aria-hidden="true">&gt;</span><span>{{ current.install }}</span></div>
    </section>

    <section class="home-card" aria-labelledby="home-write">
      <div class="card-head"><span class="card-label">Write a test</span><span class="card-index">01 / 05</span></div>
      <div class="card-body">
        <h2 id="home-write">One test, every client.</h2>
        <div class="write">
          <div class="client-tabs" role="tablist" aria-label="Client">
            <button
              v-for="item in clients"
              :key="item.id"
              type="button"
              role="tab"
              :aria-selected="item.id === preferred"
              :class="{ active: item.id === preferred }"
              @click="select(item.id)"
            >
              <span>{{ item.label }}</span><span class="tab-language">{{ item.language }}</span>
            </button>
          </div>
          <div class="code-panel">
            <div class="code-file">{{ files[preferred] }}</div>
            <div class="code-slot" role="tabpanel">
              <slot :name="preferred" />
            </div>
          </div>
        </div>
      </div>
      <div class="card-foot">
        <span class="commands"><span>Install <b>{{ current.install }}</b></span><span>Run <b>{{ current.run }}</b></span></span>
        <a href="/guide/getting-started">Getting started<span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </section>

    <section class="features" aria-labelledby="home-why">
      <div class="section-head"><h2 id="home-why" class="card-label">Why Puth</h2><span class="card-index">02 / 05</span></div>
      <div class="feature-grid">
        <div v-for="feature in features" :key="feature.title" class="home-card feature">
          <div class="feature-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="feature.icon" /></svg>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.text }}</p>
        </div>
      </div>
    </section>

    <section class="home-card" aria-labelledby="home-gui">
      <div class="card-head"><span class="card-label sky">The GUI</span><span class="card-index">03 / 05</span></div>
      <div class="card-body tight">
        <h2 id="home-gui">See every step as it runs.</h2>
        <p class="lead">Commands stream in on the left while the live viewport shows the page. Console output and errors are recorded with each command.</p>
      </div>
      <div class="browser-frame">
        <div class="browser-bar" aria-hidden="true"><span /><span /><span /><span class="address">127.0.0.1:7345</span></div>
        <img :src="image('puth-welcome.png')" alt="Puth GUI showing browser test commands alongside the browser viewport" width="1600" height="900">
      </div>
      <div class="card-foot">
        <span>Commands · Viewport · Console</span>
        <a href="/guide/screenshots-and-debugging">Screenshots and debugging<span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </section>

    <section class="home-card" aria-labelledby="home-snapshots">
      <div class="card-head"><span class="card-label indigo">Snapshots</span><span class="card-index">04 / 05</span></div>
      <div class="card-body split">
        <div class="split-text">
          <h2 id="home-snapshots">Failing in CI? Replay it locally.</h2>
          <p class="lead">Save failed test snapshots as CI artifacts, then drag a <code>.puth</code> file into your local GUI to step through what went wrong.</p>
          <ul class="plus-list">
            <li>Viewport at every command</li>
            <li>Console output and errors</li>
            <li>Opens in your local GUI by drag and drop</li>
          </ul>
        </div>
        <img :src="image('snapshot-dd.gif')" alt="Dragging an exported snapshot into the Puth GUI to inspect a recorded test" loading="lazy">
      </div>
      <div class="card-foot end">
        <a href="/guide/ci-cd">Set up CI and snapshots<span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </section>

    <section class="home-card" aria-labelledby="home-start">
      <div class="card-head"><span class="card-label">Quick start</span><span class="card-index">05 / 05</span></div>
      <div class="card-body split">
        <div class="split-text narrow">
          <h2 id="home-start">Your first run in three steps.</h2>
          <p class="lead">One server provides the browser API and the web GUI. Run it next to your tests or on a dedicated machine.</p>
        </div>
        <ol class="rail">
          <li v-for="(step, index) in steps" :key="step.title">
            <span class="rail-number" :class="{ first: index === 0 }" aria-hidden="true">{{ index + 1 }}</span>
            <div>
              <div class="rail-title">{{ step.title }}</div>
              <code class="rail-command">{{ step.command }}</code>
            </div>
          </li>
        </ol>
      </div>
      <div class="card-foot end">
        <a href="/guide/getting-started">Read the full guide<span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.puth-home { display: flex; flex-direction: column; gap: 32px; max-width: var(--puth-container); margin: 0 auto; padding: 16px 24px 0; box-sizing: content-box; }

.hero { position: relative; display: flex; flex-direction: column; min-height: 520px; padding: 64px 40px 32px; border-radius: 10px; box-sizing: border-box; }
.hero-windows span {
  position: absolute; z-index: 1; width: 560px; height: 340px; border-radius: 10px;
  background-image: radial-gradient(rgba(147, 197, 253, .55) .75px, transparent 1.1px); background-size: 4px 4px;
}
.hero-windows span:first-child { right: 40px; bottom: -40px; background-color: rgba(23, 37, 84, .55); }
.hero-windows span:last-child { right: 120px; bottom: -90px; background-color: rgba(15, 23, 63, .75); background-image: radial-gradient(rgba(147, 197, 253, .35) .75px, transparent 1.1px); }
.hero-body { position: relative; z-index: 2; margin-top: auto; max-width: 640px; }
.hero h1 {
  margin: 0; font-size: 44px; line-height: 1.1; font-weight: 500; letter-spacing: -.02em;
  background: linear-gradient(180deg, #eff6ff, rgba(219, 234, 254, .8)); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero p { margin: 22px 0 0; max-width: 560px; font-size: 16px; line-height: 1.7; color: rgba(219, 234, 254, .85); }
.hero p a { color: #eff6ff; text-decoration: underline; text-underline-offset: 4px; }
.cta {
  display: inline-flex; align-items: center; gap: 10px; margin-top: 26px; padding: 10px 16px;
  background: var(--puth-primary); color: #fff; font-family: var(--vp-font-family-mono); font-size: 13.5px; font-weight: 500; transition: background-color .2s;
}
.cta:hover { background: #1d4ed8; }
.hero-command { position: relative; z-index: 2; display: flex; gap: 12px; margin-top: 48px; overflow-x: auto; white-space: nowrap; font-family: var(--vp-font-family-mono); font-size: 12.5px; color: rgba(219, 234, 254, .85); }

.puth-home h2 { margin: 0; font-size: 26px; line-height: 1.25; font-weight: 500; letter-spacing: -.01em; color: var(--vp-c-text-1); }
.card-body { position: relative; padding: 28px 24px; }
.card-body.tight { padding-bottom: 0; }
.lead { margin: 10px 0 24px; max-width: 640px; font-size: 15px; line-height: 1.7; color: var(--vp-c-text-2); }
.lead code { padding: 1px 5px; border-radius: 4px; background: rgba(163, 163, 163, .12); font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-1); }

.write { display: flex; flex-wrap: wrap; gap: 32px; margin-top: 24px; }
.client-tabs { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.client-tabs button {
  display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; border: 1px solid transparent; border-radius: 8px;
  color: var(--vp-c-text-2); font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background-color .2s, color .2s;
}
.client-tabs button span:first-child { flex: 1; }
.client-tabs button:hover { color: var(--vp-c-text-1); }
.client-tabs button.active { border-color: rgba(96, 165, 250, .45); background: rgba(37, 99, 235, .12); color: var(--vp-c-text-1); }
.client-tabs button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.tab-language { font-family: var(--vp-font-family-mono); font-size: 11px; color: var(--vp-c-text-2); }
.code-panel { flex: 3 1 560px; min-width: 0; overflow: hidden; border: 1px solid rgba(163, 163, 163, .1); border-radius: 10px; background: #0a0a0a; }
.code-file { padding: 9px 16px; border-bottom: 1px dashed #333; font-family: var(--vp-font-family-mono); font-size: 11.5px; color: var(--vp-c-text-2); }
.code-slot { min-height: 270px; }
.code-slot :deep(div[class*='language-']) { margin: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; }
.code-slot :deep(span.lang), .code-slot :deep(button.copy) { display: none; }

.features { display: flex; flex-direction: column; gap: 16px; }
.section-head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; }
.puth-home .section-head h2 { font-size: 12px; font-weight: 400; letter-spacing: 0; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.feature { display: flex; flex-direction: column; gap: 14px; padding: 22px; }
.puth-home .feature h3 { margin: 0; font-size: 17px; font-weight: 500; color: var(--vp-c-text-1); }
.feature p { margin: -6px 0 0; font-size: 14px; line-height: 1.6; color: var(--vp-c-text-2); }
.feature-icon {
  display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9px;
  border: 1px solid rgba(96, 165, 250, .3); color: #93c5fd; background-color: rgba(37, 99, 235, .12);
  background-image: radial-gradient(rgba(147, 197, 253, .35) .7px, transparent 1px); background-size: 4px 4px;
}

.browser-frame { position: relative; margin: 0 24px; overflow: hidden; border: 1px solid rgba(163, 163, 163, .14); border-bottom: 0; border-radius: 10px 10px 0 0; background: #0a0a0a; }
.browser-bar { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-bottom: 1px dashed #333; }
.browser-bar span:not(.address) { width: 9px; height: 9px; border-radius: 50%; background: #404040; }
.address { display: flex; align-items: center; flex: 1; max-width: 360px; height: 24px; margin-left: 14px; padding: 0 10px; border-radius: 6px; background: #171717; font-family: var(--vp-font-family-mono); font-size: 11.5px; color: var(--vp-c-text-2); }
.browser-frame img { display: block; width: 100%; height: auto; }

.split { display: flex; flex-wrap: wrap; gap: 40px; align-items: center; }
.split > img { flex: 1 1 520px; min-width: 0; width: 100%; height: auto; border: 1px solid rgba(163, 163, 163, .14); border-radius: 10px; }
.split-text { flex: 1 1 340px; min-width: 0; }
.split-text.narrow { flex: 1 1 300px; align-self: flex-start; }
.split-text .lead { margin-bottom: 0; }
.plus-list { display: flex; flex-direction: column; gap: 10px; margin: 20px 0 0; padding: 0; list-style: none; font-family: var(--vp-font-family-mono); font-size: 12.5px; color: #d4d4d4; }
.plus-list li::before { content: '+'; margin-right: 10px; color: var(--vp-c-brand-1); }

.rail { flex: 1.6 1 460px; min-width: 0; display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.rail li { position: relative; display: flex; gap: 18px; padding-bottom: 28px; }
.rail li:last-child { padding-bottom: 0; }
.rail li:not(:last-child)::before { content: ''; position: absolute; top: 34px; bottom: 6px; left: 13.5px; border-left: 1px dashed #404040; }
.rail li > div { flex: 1; min-width: 0; }
.rail-number {
  display: flex; flex: none; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid #404040; background: #141414; font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-2);
}
.rail-number.first { border-color: rgba(96, 165, 250, .6); background: rgba(37, 99, 235, .15); color: #93c5fd; }
.rail-title { font-weight: 500; line-height: 28px; color: var(--vp-c-text-1); }
.rail-command {
  display: block; margin-top: 8px; padding: 11px 14px; overflow-x: auto; white-space: nowrap;
  border: 1px solid rgba(163, 163, 163, .1); border-radius: 8px; background: #0a0a0a;
  font-family: var(--vp-font-family-mono); font-size: 13px; color: #d4d4d4;
}

@media (max-width: 767px) {
  .hero { min-height: 0; padding: 48px 20px 24px; }
  .hero h1 { font-size: 32px; }
  .hero-windows { display: none; }
  .card-body { padding: 24px 18px; }
  .browser-frame { margin: 0 18px; }
}
</style>
