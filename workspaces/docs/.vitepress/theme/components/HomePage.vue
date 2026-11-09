<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import { useSdkState } from '../sdk';
import { client, clients, type Sdk } from '../../lib/sdk';
import GuiMock from './GuiMock.vue';

const { preferred, select } = useSdkState();
const current = computed(() => client(preferred.value));

// The same login test in every client. A line with a number is the step of that number in the GUI.
type Line = [text: string, step?: number];
const tests: Record<Sdk, { file: string; origin: string; lines: Line[] }> = {
  laravel: {
    file: 'tests/Browser/LoginTest.php',
    origin: 'https://app.test',
    lines: [
      ['public function test_user_can_log_in(): void'],
      ['{'],
      ['    $this->browse(function (Browser $browser) {'],
      ["        $browser->visit('/login')", 1],
      ["            ->type('email', 'ada@example.com')", 2],
      ["            ->type('password', 'secret')", 3],
      ["            ->press('Log in')", 4],
      ["            ->assertPathIs('/dashboard')", 5],
      ["            ->assertSee('Welcome back, Ada');", 6],
      ['    });'],
      ['}'],
    ],
  },
  spring: {
    file: 'src/test/java/LoginTest.java',
    origin: 'http://localhost',
    lines: [
      ['@Test'],
      ['void user_can_log_in(Browser browser) {'],
      ['    browser.visit("http://localhost/login")', 1],
      ['        .type("email", "ada@example.com")', 2],
      ['        .type("password", "secret")', 3],
      ['        .press("Log in")', 4],
      ['        .assertPathIs("/dashboard")', 5],
      ['        .assertSee("Welcome back, Ada");', 6],
      ['}'],
    ],
  },
  php: {
    file: 'tests/LoginTest.php',
    origin: 'https://app.test',
    lines: [
      ['public function test_user_can_log_in(): void'],
      ['{'],
      ['    $browser = $this->context->createBrowserShim();'],
      ["    $browser->visit('https://app.test/login')", 1],
      ["        ->type('email', 'ada@example.com')", 2],
      ["        ->type('password', 'secret')", 3],
      ["        ->press('Log in')", 4],
      ["        ->assertPathIs('/dashboard')", 5],
      ["        ->assertSee('Welcome back, Ada');", 6],
      ['}'],
    ],
  },
  java: {
    file: 'src/test/java/LoginTest.java',
    origin: 'https://app.test',
    lines: [
      ['@Test'],
      ['void user_can_log_in() {'],
      ['    Browser browser = context.createBrowserShim();'],
      ['    browser.visit("https://app.test/login")', 1],
      ['        .type("email", "ada@example.com")', 2],
      ['        .type("password", "secret")', 3],
      ['        .press("Log in")', 4],
      ['        .assertPathIs("/dashboard")', 5],
      ['        .assertSee("Welcome back, Ada");', 6],
      ['}'],
    ],
  },
  js: {
    file: 'tests/login.test.ts',
    origin: 'https://app.test',
    lines: [
      ["test('user can log in', async () => {"],
      ["    await browser.visit('https://app.test/login');", 1],
      ["    await browser.type('email', 'ada@example.com');", 2],
      ["    await browser.type('password', 'secret');", 3],
      ["    await browser.press('Log in');", 4],
      ["    await browser.assertPathIs('/dashboard');", 5],
      ["    await browser.assertSee('Welcome back, Ada');", 6],
      ['});'],
    ],
  },
};
const test = computed(() => tests[preferred.value]);

// Colors code like the docs: strings, variables, annotations, keywords, calls and types.
const KEYWORDS = new Set(['public', 'function', 'void', 'await', 'async', 'test']);
function tokens(line: string) {
  const out: { text: string; kind: string }[] = [];
  const re = /('[^']*'|"[^"]*")|(\$\w+)|(@\w+)|([A-Za-z_]\w*)|(\s+|[^\sA-Za-z_$'"@]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    let kind = 'tx';
    if (match[1]) kind = 'str';
    else if (match[2]) kind = 'var';
    else if (match[3]) kind = 'at';
    else if (match[4]) {
      const next = line.slice(re.lastIndex).trimStart()[0];
      kind = KEYWORDS.has(match[4]) ? 'kw' : next === '(' ? 'fn' : /^[A-Z]/.test(match[4]) ? 'type' : 'tx';
    }
    out.push({ text: match[0], kind });
  }
  return out;
}
const lines = computed(() => test.value.lines.map(([text, step]) => ({ tokens: tokens(text), step })));
const pad = (n: number) => String(n).padStart(2, '0');

// The hero plays through the steps until the reader points at one, unless they prefer less motion.
const step = ref(4);
let timer: ReturnType<typeof setInterval> | undefined;
function stop() {
  clearInterval(timer);
  timer = undefined;
}
function pick(n: number) {
  stop();
  step.value = n;
}
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  step.value = 1;
  timer = setInterval(() => { step.value = step.value % 6 + 1; }, 1800);
});
onBeforeUnmount(stop);

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
    <section class="stage puth-dither puth-dither-strong" aria-labelledby="home-title">
      <div class="stage-fade" aria-hidden="true" />
      <div class="stage-inner">
        <div class="stage-text">
          <h1 id="home-title">See what your browser tests do.</h1>
          <p>
            Native browser tests for Laravel, Java and Node.js. Every command shows up in a realtime GUI, and a failure
            from CI opens on your own machine. <a href="/guide/migration-from-dusk">Migrating from Dusk?</a>
          </p>
          <div class="cta-row">
            <a class="cta" href="/guide/getting-started">
              Get started
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <span class="install"><span aria-hidden="true">&gt;</span> {{ current.install }}</span>
          </div>

          <div class="code-card">
            <div class="code-tabs" role="tablist" aria-label="Client">
              <button
                v-for="item in clients"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="item.id === preferred"
                :class="{ active: item.id === preferred }"
                @click="select(item.id)"
              >{{ item.label }}</button>
            </div>
            <div class="code-file">{{ test.file }}</div>
            <div class="code-lines" role="tabpanel">
              <div
                v-for="(line, index) in lines"
                :key="`${preferred}-${index}`"
                :class="['line', { stepped: line.step, active: line.step === step }]"
                @mouseenter="line.step && pick(line.step)"
              >
                <button v-if="line.step" type="button" class="line-step" :aria-label="`Show step ${line.step} in the GUI`" @click="pick(line.step)" @focus="pick(line.step)">{{ pad(line.step) }}</button>
                <span v-else class="line-step" aria-hidden="true" />
                <code><span v-for="(token, t) in line.tokens" :key="t" :class="token.kind">{{ token.text }}</span></code>
              </div>
            </div>
            <div class="code-foot"><span>Point at a line to see its step</span><span>Run <b>{{ current.run }}</b></span></div>
          </div>
        </div>

        <div class="stage-gui">
          <GuiMock :step="step" :origin="test.origin" @pick="pick" />
        </div>
      </div>
    </section>

    <section class="features" aria-labelledby="home-why">
      <div class="section-head"><h2 id="home-why" class="card-label">Why Puth</h2><span class="card-index">01 / 03</span></div>
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

    <section class="home-card" aria-labelledby="home-snapshots">
      <div class="card-head"><span class="card-label indigo">Snapshots</span><span class="card-index">02 / 03</span></div>
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
        <img :src="image('snapshot-dd.gif')" alt="Dragging an exported snapshot into the Puth GUI to inspect a recorded test" width="1200" height="675" loading="lazy">
      </div>
      <div class="card-foot end">
        <a href="/guide/ci-cd">Set up CI and snapshots<span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </section>

    <section class="home-card" aria-labelledby="home-start">
      <div class="card-head"><span class="card-label">Quick start</span><span class="card-index">03 / 03</span></div>
      <div class="card-body split">
        <div class="split-text narrow">
          <h2 id="home-start">Your first run in three steps.</h2>
          <p class="lead">One server provides the browser API and the web GUI. Run it next to your tests or on a dedicated machine.</p>
        </div>
        <ol class="rail">
          <li v-for="(item, index) in steps" :key="item.title">
            <span class="rail-number" :class="{ first: index === 0 }" aria-hidden="true">{{ index + 1 }}</span>
            <div>
              <div class="rail-title">{{ item.title }}</div>
              <code class="rail-command">{{ item.command }}</code>
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
.puth-home { display: flex; flex-direction: column; gap: 32px; max-width: var(--puth-container); margin: 0 auto; padding: 0 24px; box-sizing: content-box; }
/* The stage reaches the edges of the window, the page itself never scrolls sideways. */
:global(.VPHome) { overflow-x: clip; }

.stage { margin: 0 calc(50% - 50vw); padding: 56px 0 72px; }
/* Lies above the dots and grain of the dither, so the stage fades into the page instead of ending at an edge.
   It passes through the navy the stage ends in, a neutral black would turn the blue grey on the way. */
.stage-fade { position: absolute; inset: auto 0 0; z-index: 1; height: 240px; background: linear-gradient(180deg, rgba(23, 37, 84, 0), rgba(23, 37, 84, .85) 45%, rgba(14, 20, 40, .95) 75%, #0a0a0a); pointer-events: none; }
/* The background reaches the edges, the content lines up with the rest of the page. */
.stage-inner { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 32px; max-width: calc(var(--puth-container) + 48px); margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
/* Dots and grain fade out behind the text, so it stays easy to read. */
.stage::before {
  -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, .12) 0%, rgba(0, 0, 0, .25) 35%, #000 75%);
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, .12) 0%, rgba(0, 0, 0, .25) 35%, #000 75%);
}
.stage::after {
  opacity: .28;
  -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, .35) 0%, rgba(0, 0, 0, .5) 35%, #000 75%);
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, .35) 0%, rgba(0, 0, 0, .5) 35%, #000 75%);
}
.stage-text { position: relative; z-index: 2; display: flex; flex: 1 1 380px; flex-direction: column; gap: 22px; min-width: 0; max-width: 470px; }
.stage-gui { flex: 2 1 640px; min-width: 0; padding-top: 6px; }
.stage h1 { margin: 0; font-size: 44px; line-height: 1.08; font-weight: 500; letter-spacing: -.025em; color: #fff; }
.stage p { margin: 0; font-size: 15.5px; line-height: 1.65; color: #dbeafe; }
.stage p a { color: #eff6ff; text-decoration: underline; text-underline-offset: 4px; }
.cta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; }
.cta {
  display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--puth-primary); color: #fff;
  font-family: var(--vp-font-family-mono); font-size: 13.5px; font-weight: 500; transition: background-color .2s;
}
.cta:hover { background: #1d4ed8; }
.install { font-family: var(--vp-font-family-mono); font-size: 12.5px; color: #dbeafe; }

.code-card {
  display: flex; flex-direction: column; margin: 8px -56px 0 0; overflow: hidden;
  border: 1px solid rgba(163, 163, 163, .14); border-radius: 10px; background: #0a0a0a; box-shadow: 0 30px 80px rgba(0, 0, 0, .6);
}
.code-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 8px; border-bottom: 1px dashed #333; }
.code-tabs button {
  height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 6px; color: var(--vp-c-text-2); font-size: 12.5px;
  cursor: pointer; transition: color .2s, background-color .2s;
}
.code-tabs button:hover { color: var(--vp-c-text-1); }
.code-tabs button.active { border-color: rgba(96, 165, 250, .45); background: rgba(37, 99, 235, .12); color: var(--vp-c-text-1); }
.code-tabs button:focus-visible, .line-step:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.code-file { padding: 7px 16px; border-bottom: 1px dashed #333; font-family: var(--vp-font-family-mono); font-size: 11px; color: var(--vp-c-text-2); }
.code-lines { min-height: 300px; padding: 12px 0; overflow-x: auto; font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.6; }
.line { display: flex; align-items: center; gap: 12px; min-height: 26px; padding-right: 14px; white-space: pre; transition: background-color .2s; }
.line.stepped { cursor: pointer; }
.line.active { background: rgba(37, 99, 235, .14); box-shadow: inset 2px 0 0 #60a5fa; }
.line-step { flex: none; width: 22px; padding: 0; border: 0; background: none; text-align: right; font-family: inherit; font-size: 10.5px; color: #525252; cursor: pointer; }
.line.active .line-step { color: #93c5fd; }
.line code { font-family: inherit; font-size: inherit; color: #a3a3a3; background: none; padding: 0; }
.str { color: #7dd3fc; }
.var { color: #fafafa; }
.at { color: #a3a3a3; }
.kw { color: #a5b4fc; }
.fn { color: #93c5fd; }
.type { color: #e5e5e5; }
.code-foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; padding: 9px 16px; border-top: 1px dashed #333; font-family: var(--vp-font-family-mono); font-size: 11.5px; color: var(--vp-c-text-2); }
.code-foot b { font-weight: 400; color: var(--vp-c-text-1); }

.puth-home h2 { margin: 0; font-size: 26px; line-height: 1.25; font-weight: 500; letter-spacing: -.01em; color: var(--vp-c-text-1); }
.card-body { position: relative; padding: 28px 24px; }
.lead { margin: 10px 0 24px; max-width: 640px; font-size: 15px; line-height: 1.7; color: var(--vp-c-text-2); }
.lead code { padding: 1px 5px; border-radius: 4px; background: rgba(163, 163, 163, .12); font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-1); }

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

/* Below this width text, code and GUI stack, so the code no longer overlaps the GUI. */
@media (max-width: 1099px) {
  .stage-text { max-width: none; }
  .code-card { margin-right: 0; }
}
@media (max-width: 767px) {
  .stage { padding: 40px 0 56px; }
  .stage h1 { font-size: 32px; }
  .stage-inner { padding: 0 16px; }
  .card-body { padding: 24px 18px; }
}
</style>
