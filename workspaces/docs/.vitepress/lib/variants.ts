import type MarkdownIt from 'markdown-it';

// Code blocks of the clients. A PHP block followed directly by Java and TypeScript blocks is one example in several
// clients, of which each reader sees their own.
const LANGUAGES: Record<string, 'php' | 'java' | 'ts'> = { php: 'php', java: 'java', ts: 'ts', typescript: 'ts', js: 'ts' };

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sdkVariants(md: MarkdownIt) {
  md.core.ruler.push('sdk_variants', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'fence' || LANGUAGES[token.info.trim().split(/\s/)[0]] !== 'php') continue;

      let end = i + 1;
      while (end < tokens.length && tokens[end].type === 'fence' && ['java', 'ts'].includes(LANGUAGES[tokens[end].info.trim().split(/\s/)[0]])) {
        end++;
      }
      if (end === i + 1) continue;

      const group = tokens.slice(i, end);
      const langs = group.map(fence => LANGUAGES[fence.info.trim().split(/\s/)[0]]).join(' ');
      const wrapped = group.flatMap((fence) => {
        const open = new state.Token('html_block', '', 0);
        open.content = `<SdkCode lang="${LANGUAGES[fence.info.trim().split(/\s/)[0]]}" langs="${langs}">\n`;
        const close = new state.Token('html_block', '', 0);
        close.content = '</SdkCode>\n';
        return [open, fence, close];
      });
      tokens.splice(i, group.length, ...wrapped);
      i += wrapped.length - 1;
    }

    // `$browser->assertSee()` in prose is written the way the selected client calls it.
    for (const token of tokens) {
      if (token.type !== 'inline' || !token.children) continue;
      token.children = token.children.map((child) => {
        if (child.type !== 'code_inline' || !/^\$(browser|context)->/.test(child.content)) return child;
        const ref = new state.Token('html_inline', '', 0);
        ref.content = `<SdkRef code="${escape(child.content)}" />`;
        return ref;
      });
    }
  });
}
