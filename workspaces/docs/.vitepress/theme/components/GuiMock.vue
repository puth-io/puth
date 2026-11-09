<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';

// A compact Puth GUI showing the login test of the home page. The selected step decides the page it shows.
const props = defineProps<{ step: number; origin: string }>();
const emit = defineEmits<{ pick: [step: number] }>();

type Kind = 'nav' | 'act' | 'check';
const steps = computed(() => [
  { func: 'visit', args: `'${props.origin}/login'`, kind: 'nav' as Kind, took: '412ms', page: hostPath('/login') },
  { func: 'type', args: "'email', 'ada@example.com'", kind: 'act' as Kind, took: '96ms' },
  { func: 'type', args: "'password', 'secret'", kind: 'act' as Kind, took: '88ms' },
  { func: 'press', args: "'Log in'", kind: 'act' as Kind, took: '640ms', events: '2 requests' },
  { func: 'assertPathIs', args: "'/dashboard'", kind: 'check' as Kind, took: '4ms', page: '/dashboard' },
  { func: 'assertSee', args: "'Welcome back, Ada'", kind: 'check' as Kind, took: '11ms' },
]);

function hostPath(path: string) {
  return props.origin.replace(/^https?:\/\//, '') + path;
}

const current = computed(() => steps.value[props.step - 1]);
const url = computed(() => props.origin + (props.step <= 3 ? '/login' : '/dashboard'));
const pad = (n: number) => String(n).padStart(2, '0');
const logo = withBase('/assets/image/puth-logo-blue.png');
</script>

<template>
  <div class="gui" role="img" aria-label="The Puth GUI showing the steps of the login test and the page at the selected step">
    <div class="rail" aria-hidden="true">
      <img :src="logo" alt="">
      <span class="rail-rule" />
      <span class="rail-item active">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H4zM8 20h8M12 16v4" /></svg>
      </span>
      <span class="rail-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M8 6h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3ZM9.5 11.5v1M14.5 11.5v1" /></svg>
      </span>
      <span class="rail-fill" />
      <span class="rail-dot" />
    </div>

    <div class="run">
      <div class="run-status"><span class="passed">Passed</span><span>6 steps · 00:02s</span></div>
      <div class="run-title">
        <div>test_user_can_log_in</div>
        <div class="run-class">Tests\Browser\LoginTest</div>
      </div>
      <div class="run-tabs"><span class="active">Steps <i>6</i></span><span>Console <i>0</i></span><span>Network <i>2</i></span></div>
      <ol class="gm-steps">
        <template v-for="(item, index) in steps" :key="index">
          <!-- A page divider sits above the step that opened the page, or that runs first on it. -->
          <li v-if="item.page" class="page">→ <span>{{ item.page }}</span></li>
          <li>
            <button type="button" :class="['step', { active: index + 1 === step }]" :aria-pressed="index + 1 === step" tabindex="-1" @click="emit('pick', index + 1)">
              <span class="index">{{ pad(index + 1) }}</span>
              <span :class="['func', item.kind]">{{ item.func }}</span>
              <span class="args">{{ item.args }}</span>
              <span v-if="index + 1 === step" class="took">{{ item.took }}</span>
            </button>
          </li>
          <li v-if="item.events" class="events">› {{ item.events }}</li>
        </template>
      </ol>
    </div>

    <div class="view">
      <div class="toolbar"><span class="toggle"><span>Before</span><span class="on">After</span></span><span class="url">{{ url }}</span></div>
      <div class="stage">
        <div class="page-frame">
          <div class="app-bar"><span>Acme</span><span v-if="step >= 4" class="avatar" /></div>
          <div v-if="step <= 3" class="login">
            <div class="login-card">
              <div class="login-title">Log in</div>
              <div class="field" :class="{ hl: step === 2 }"><span>Email</span><span class="input">{{ step >= 2 ? 'ada@example.com' : '' }}</span></div>
              <div class="field" :class="{ hl: step === 3 }"><span>Password</span><span class="input dots">{{ step >= 3 ? '••••••' : '' }}</span></div>
              <span class="button">Log in</span>
            </div>
          </div>
          <div v-else class="dashboard">
            <div class="welcome" :class="{ hl: step === 6 }">Welcome back, Ada</div>
            <div class="tiles"><span /><span /><span /></div>
            <span class="panel" />
          </div>
        </div>
      </div>
      <div class="footer"><span>Step <b>{{ pad(step) }}</b> / 06 · <em>Browser.{{ current.func }}</em> · after</span><span>{{ current.took }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.gui {
  display: flex; height: 560px; overflow: hidden; border: 1px solid rgba(163, 163, 163, .16); border-radius: 10px;
  background: #0a0a0a; color: #fafafa; box-shadow: 0 30px 80px rgba(0, 0, 0, .55); font-family: var(--vp-font-family-base); text-align: left;
}
.rail { display: flex; flex: none; flex-direction: column; align-items: center; gap: 6px; width: 44px; padding: 10px 0; box-sizing: border-box; border-right: 1px solid rgba(163, 163, 163, .1); background: #101010; }
.rail img { width: 20px; height: 20px; object-fit: contain; }
.rail-rule { width: 18px; margin: 3px 0; border-top: 1px dashed #404040; }
.rail-item { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid transparent; border-radius: 8px; box-sizing: border-box; color: #a3a3a3; }
.rail-item.active { border-color: rgba(96, 165, 250, .35); background: rgba(37, 99, 235, .16); color: #93c5fd; }
.rail-fill { flex: 1; }
.rail-dot { width: 7px; height: 7px; margin-bottom: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, .18); }

.run { display: flex; flex: none; flex-direction: column; width: 268px; min-height: 0; border-right: 1px solid rgba(163, 163, 163, .1); background: #161616; }
.run-status { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px dashed #333; font-family: var(--vp-font-family-mono); font-size: 11px; color: #a3a3a3; }
.passed { color: #86efac; }
.run-title { padding: 10px 12px 8px; font-size: 14px; font-weight: 500; }
.run-class { margin-top: 3px; font-family: var(--vp-font-family-mono); font-size: 10.5px; font-weight: 400; color: #a3a3a3; }
.run-tabs { display: flex; gap: 4px; padding: 0 10px 8px; border-bottom: 1px dashed #333; font-size: 11.5px; color: #a3a3a3; }
.run-tabs span { padding: 4px 8px; border: 1px solid transparent; border-radius: 6px; }
.run-tabs span.active { border-color: rgba(255, 255, 255, .2); background: #262626; color: #fafafa; }
.run-tabs i { font-family: var(--vp-font-family-mono); font-size: 10px; font-style: normal; color: #a3a3a3; }
.gm-steps { flex: 1; min-height: 0; margin: 0; padding: 6px; overflow: hidden; list-style: none; }
/* The docs style lists, the GUI has its own spacing. */
.gm-steps li { margin: 0; }
.page { display: flex; align-items: center; gap: 6px; padding: 7px 8px 3px; font-family: var(--vp-font-family-mono); font-size: 10px; color: #a3a3a3; }
.page span { color: #d4d4d4; }
.page::after { content: ''; flex: 1; border-top: 1px dashed #404040; }
.step {
  display: flex; align-items: center; gap: 8px; width: 100%; height: 28px; padding: 0 8px; border: 1px solid transparent; border-radius: 6px;
  color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color .2s, border-color .2s;
}
.step:hover { background: rgba(163, 163, 163, .06); }
.step.active { border-color: rgba(96, 165, 250, .45); background: rgba(37, 99, 235, .12); }
.index { flex: none; width: 16px; text-align: right; font-family: var(--vp-font-family-mono); font-size: 10px; color: #8f8f8f; }
.step.active .index { color: #93c5fd; }
.func { flex: none; font-family: var(--vp-font-family-mono); font-size: 11.5px; }
.func.nav { color: #5eead4; }
.func.act { color: #93c5fd; }
.func.check { color: #c4b5fd; }
.args { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--vp-font-family-mono); font-size: 11px; color: #d4d4d4; }
.took { font-family: var(--vp-font-family-mono); font-size: 10px; color: #a3a3a3; }
.events { display: flex; align-items: center; height: 18px; margin-left: 34px; padding-left: 6px; border-left: 1px dashed #404040; font-family: var(--vp-font-family-mono); font-size: 10px; color: #a3a3a3; }

.view { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: 1px solid rgba(163, 163, 163, .1); background: #121212; }
.toggle { display: flex; padding: 2px; border: 1px solid rgba(163, 163, 163, .16); border-radius: 7px; background: #0a0a0a; font-family: var(--vp-font-family-mono); font-size: 10.5px; color: #a3a3a3; }
.toggle span { padding: 3px 8px; border-radius: 5px; }
.toggle .on { background: #2563eb; color: #fff; }
.url {
  display: flex; flex: 1; align-items: center; min-width: 0; height: 24px; padding: 0 10px; overflow: hidden; white-space: nowrap;
  border: 1px solid rgba(163, 163, 163, .12); border-radius: 7px; background: #0a0a0a; font-family: var(--vp-font-family-mono); font-size: 10.5px; color: #d4d4d4;
}
.stage {
  display: flex; flex: 1; align-items: stretch; justify-content: center; min-height: 0; padding: 10px;
  background-color: #0a0a0a; background-image: radial-gradient(rgba(163, 163, 163, .12) .75px, transparent 1.1px); background-size: 12px 12px;
}
.page-frame {
  position: relative; width: 100%; overflow: hidden; box-sizing: border-box;
  border: 1px solid #27272a; border-radius: 6px; background: #141417; color: #e4e4e7; font-family: Arial, system-ui, sans-serif; box-shadow: 0 16px 40px rgba(0, 0, 0, .5);
}
.app-bar { display: flex; align-items: center; justify-content: space-between; height: 30px; padding: 0 14px; border-bottom: 1px solid #27272a; background: #1b1b1f; font-size: 11px; font-weight: 600; }
.avatar { width: 18px; height: 18px; border-radius: 50%; background: #4338ca; }
.login { display: flex; justify-content: center; padding: 26px 16px 0; }
/* Keeps a usable width in the narrow viewport next to the hero text. */
.login-card { display: flex; flex-direction: column; gap: 10px; width: min(260px, 100%); padding: 16px; box-sizing: border-box; border: 1px solid #2e2e33; border-radius: 8px; background: #1b1b1f; font-size: 10px; }
.login-title { font-size: 13px; font-weight: 600; }
.field { position: relative; display: flex; flex-direction: column; gap: 4px; color: #a1a1aa; }
.input { display: flex; align-items: center; height: 22px; padding: 0 7px; border: 1px solid #3f3f46; border-radius: 4px; background: #111113; color: #e4e4e7; }
.input.dots { letter-spacing: 2px; }
.button { display: flex; align-items: center; justify-content: center; height: 24px; margin-top: 2px; border-radius: 4px; background: #4f46e5; color: #fff; font-weight: 600; }
.dashboard { display: flex; flex-direction: column; gap: 12px; padding: 18px 16px; }
.welcome { position: relative; align-self: flex-start; font-size: 17px; font-weight: 600; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 10px; }
.tiles span, .panel { height: 54px; border: 1px solid #27272a; border-radius: 6px; background: #1b1b1f; }
.panel { height: 70px; }
.hl::after { content: ''; position: absolute; inset: -4px; border: 2px solid #3b82f6; border-radius: 7px; background: rgba(59, 130, 246, .16); }
.welcome.hl::after { inset: -5px -7px; border-color: #8b5cf6; background: rgba(139, 92, 246, .16); }
.footer { display: flex; justify-content: space-between; padding: 7px 12px; border-top: 1px solid rgba(163, 163, 163, .1); background: #121212; font-family: var(--vp-font-family-mono); font-size: 10.5px; color: #a3a3a3; }
.footer b { font-weight: 400; color: #fafafa; }
.footer em { font-style: normal; color: #93c5fd; }

@media (max-width: 767px) {
  .gui { height: auto; }
  .rail, .view { display: none; }
  .run { width: 100%; border-right: 0; }
}
</style>
