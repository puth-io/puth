import { defineConfig } from 'vitepress';
import { sdkSearch } from './lib/search';

export default defineConfig({
  lang: 'en-US',
  title: 'Puth',
  description: 'Browser testing with native clients, a realtime GUI, and test replay.',
  cleanUrls: true,
  appearance: 'dark',
  srcExclude: ['README.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/assets/image/puth-logo-blue.png' }],
    ['meta', { name: 'theme-color', content: '#191a1d' }],
  ],
  themeConfig: {
    logo: '/assets/image/puth-logo-blue.png',
    nav: [
      { text: 'Documentation', link: '/guide/getting-started' },
      { text: 'Laravel', link: '/guide/laravel' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Puth?', link: '/guide/what-is-puth' },
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Migrating from Dusk', link: '/guide/migration-from-dusk' },
          { text: 'CI/CD and snapshots', link: '/guide/ci-cd' },
        ],
      },
      {
        text: 'Laravel',
        items: [
          { text: 'Laravel integration', link: '/guide/laravel' },
          { text: 'Laravel cookies', link: '/guide/laravel-cookies' },
          { text: 'Laravel test artifacts', link: '/guide/laravel-debugging' },
        ],
      },
      {
        text: 'Browser testing',
        items: [
          { text: 'Browser basics', link: '/guide/browser-basics' },
          { text: 'Selectors and resolvers', link: '/guide/selectors-and-resolvers' },
          { text: 'Interacting with elements', link: '/guide/interacting-with-elements' },
          { text: 'Waiting and sync', link: '/guide/waiting-and-sync' },
          { text: 'Assertions', link: '/guide/assertions' },
          { text: 'Dialogs and prompts', link: '/guide/dialogs-and-prompts' },
          { text: 'Cookies', link: '/guide/cookies' },
          { text: 'Portal and detours', link: '/guide/portal' },
          { text: 'Screenshots and debugging', link: '/guide/screenshots-and-debugging' },
        ],
      },
      {
        text: 'API reference',
        items: [
          { text: 'Browser', link: '/api/browser' },
          { text: 'Context', link: '/api/context' },
          { text: 'Pages and elements', link: '/api/remote-objects' },
        ],
      },
      {
        text: 'Project',
        items: [{ text: 'Roadmap', link: '/guide/roadmap' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/puth-io/puth' }],
    editLink: {
      pattern: 'https://github.com/puth-io/puth/edit/master/workspaces/docs/:path',
    },
    search: { provider: 'local', options: sdkSearch },
  },
});
