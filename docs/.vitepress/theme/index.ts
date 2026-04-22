import DefaultTheme from 'vitepress/theme';
import type { App } from 'vue';
import LiveDemo from '../components/LiveDemo.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('LiveDemo', LiveDemo);
  },
};
