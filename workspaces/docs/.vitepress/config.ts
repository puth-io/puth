import { defineConfig } from 'vitepress';

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
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'CI/CD and snapshots', link: '/guide/ci-cd' },
          { text: 'Roadmap', link: '/guide/roadmap' },
          { text: 'Laravel', link: '/guide/laravel' },
          { text: 'Portal and detours', link: '/guide/portal' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/puth-io/puth' }],
    editLink: {
      pattern: 'https://github.com/puth-io/puth/edit/master/workspaces/docs/:path',
    },
    search: { provider: 'local' },
  },
});
