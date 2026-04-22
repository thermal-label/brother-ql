import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import LiveDemo from '../components/LiveDemo.vue';
import './custom.css';

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveDemo', LiveDemo);
  },
};

export default theme;
