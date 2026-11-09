import { defineConfig } from 'vitepress';
import { sdkSearch } from './lib/search';
import { sdkVariants } from './lib/variants';

export default defineConfig({
  lang: 'en-US',
  title: 'Puth',
  description: 'Browser testing with native clients, a realtime GUI, and test replay.',
  cleanUrls: true,
  appearance: 'force-dark',
  srcExclude: ['README.md'],
  markdown: {
    config(md) {
      md.use(sdkVariants);
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/assets/image/puth-logo-blue.png' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a' }],
  ],
  themeConfig: {
    logo: '/assets/image/puth-logo-blue.png',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '^/guide/(?!mcp|example-laravel)' },
      { text: 'Agents', link: '/guide/mcp', activeMatch: '^/guide/(mcp|example-laravel)' },
      { text: 'API', link: '/api/browser', activeMatch: '^/api/' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Puth?', link: '/guide/what-is-puth' },
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'CI/CD and snapshots', link: '/guide/ci-cd' },
          { text: 'Client support', link: '/guide/client-support' },
        ],
      },
      {
        text: 'Agents',
        items: [
          { text: 'MCP server', link: '/guide/mcp' },
          { text: 'Laravel example', link: '/guide/example-laravel' },
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
    outline: { label: 'On this page' },
    docFooter: { prev: '< Previous', next: 'Next >' },
  },
});
