import type { DefaultTheme } from 'vitepress';
import { client, pageSdk } from './sdk';

function decodeAttribute(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export const sdkSearch: DefaultTheme.LocalSearchOptions = {
  // The default excerpt renderer mounts Markdown without the theme's SDK
  // components. Keep results concise instead of showing mixed-client previews.
  detailedView: false,
  // Index both authored variants, including their SDK labels. VitePress does
  // not execute Vue components while creating its local search index.
  _render(src, env, md) {
    const source = src
      .replace(/<SdkContent sdk="([a-z ]+)">/g, (_, sdks: string) => {
        const labels: Record<string, string> = { php: 'PHP', laravel: 'Laravel', spring: 'Spring Boot', java: 'Java', js: 'Node.js' };
        return `\n\n**${sdks.split(' ').map(sdk => labels[sdk] ?? sdk).join(' / ')}**\n\n`;
      })
      .replace(/<\/SdkContent>/g, '')
      .replace(/<SdkCall php="([^"]*)" laravel="([^"]*)"\s*\/>/g, (_, php, laravel) => {
        return `Laravel: \`${decodeAttribute(laravel)}\`; PHP: \`${decodeAttribute(php)}\``;
      });
    // Method references in prose are components on the page, the index keeps their PHP form.
    const html = md.render(source, env).replace(/<SdkRef code="([^"]*)" \/>/g, (_, code) => `<code>${code}</code>`);
    if (env.frontmatter?.search === false) return '';
    const fixed = pageSdk('/' + env.relativePath.replace(/\.md$/, ''));
    const label = fixed ? client(fixed).label : 'Laravel / PHP';
    // VitePress reads heading text before its trailing anchor link.
    return html.replace(/(<h1\b[^>]*>)([\s\S]*?)(<a\b)/,
      (_, opening, title, anchor) => `${opening}${title.trimEnd()} · ${label} ${anchor}`);
  },
};
