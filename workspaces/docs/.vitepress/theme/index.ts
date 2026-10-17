import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import SiteFooter from './SiteFooter.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-bottom': () => h(SiteFooter),
  }),
};
