import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import '@fontsource-variable/geist';
import '@fontsource-variable/jetbrains-mono';
import SdkLayout from './SdkLayout.vue';
import SdkContent from './components/SdkContent.vue';
import SdkCall from './components/SdkCall.vue';
import HomePage from './components/HomePage.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: SdkLayout,
  enhanceApp({ app }) {
    app.component('SdkContent', SdkContent);
    app.component('SdkCall', SdkCall);
    app.component('HomePage', HomePage);
  },
} satisfies Theme;
