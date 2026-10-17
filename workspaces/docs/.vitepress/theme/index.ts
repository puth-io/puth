import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import SdkLayout from './SdkLayout.vue';
import SdkContent from './components/SdkContent.vue';
import SdkCall from './components/SdkCall.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: SdkLayout,
  enhanceApp({ app }) {
    app.component('SdkContent', SdkContent);
    app.component('SdkCall', SdkCall);
  },
} satisfies Theme;
