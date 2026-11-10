export const sdks = ['laravel', 'spring', 'php', 'java', 'js'] as const;
export type Sdk = typeof sdks[number];

// Pages are written for Laravel and plain PHP. A page lists further variants in
// its `sdks` frontmatter; clients without a variant show the PHP one with a note.
export const defaultContentSdks: readonly Sdk[] = ['laravel', 'php'];

export interface Client {
  id: Sdk;
  label: string;
  language: string;
  status: 'Primary' | 'Supported' | 'Beta';
  description: string;
  install: string;
  run: string;
}

export const clients: Client[] = [
  { id: 'laravel', label: 'Laravel', language: 'PHP', status: 'Primary', description: 'Dusk-style API, runs with php artisan test.', install: 'composer require --dev puth/php', run: 'php artisan test' },
  { id: 'spring', label: 'Spring Boot', language: 'Java', status: 'Beta', description: 'JUnit extension that serves your app through MockMvc.', install: 'io.puth.client:client (Maven)', run: 'mvn test' },
  { id: 'php', label: 'Plain PHP', language: 'PHP', status: 'Supported', description: 'Standalone client for any PHPUnit project.', install: 'composer require --dev puth/php', run: 'vendor/bin/phpunit' },
  { id: 'java', label: 'Plain Java', language: 'Java', status: 'Beta', description: 'Standalone client for JUnit.', install: 'io.puth.client:client (Maven)', run: 'mvn test' },
  { id: 'js', label: 'Node.js', language: 'JavaScript', status: 'Beta', description: 'TypeScript client for any test runner.', install: 'npm install --save-dev @puth/client', run: 'npm test' },
];

// Languages shown in the client selector. Planned ones have no clients yet.
export const languages = ['PHP', 'Java', 'JavaScript', 'Go', 'Rust'] as const;
export const plannedLanguages = new Set<string>(['Go', 'Rust']);

// Pages that only apply to one client. Readers see them for that client.
export const clientPages: Record<string, Sdk> = {
  '/guide/laravel': 'laravel',
  '/guide/laravel-cookies': 'laravel',
  '/guide/laravel-debugging': 'laravel',
  '/guide/migration-from-dusk': 'laravel',
  '/guide/spring-boot': 'spring',
};
export const laravelPages = new Set(Object.keys(clientPages).filter(page => clientPages[page] === 'laravel'));

// The sidebar group for each client's own pages, shown for the selected client.
export const clientSidebar: Partial<Record<Sdk, { text: string; link: string }[]>> = {
  laravel: [
    { text: 'Laravel integration', link: '/guide/laravel' },
    { text: 'Laravel cookies', link: '/guide/laravel-cookies' },
    { text: 'Laravel test artifacts', link: '/guide/laravel-debugging' },
    { text: 'Migrating from Dusk', link: '/guide/migration-from-dusk' },
  ],
  spring: [
    { text: 'Spring Boot integration', link: '/guide/spring-boot' },
  ],
};

export function isSdk(value: unknown): value is Sdk {
  return typeof value === 'string' && (sdks as readonly string[]).includes(value);
}

export function client(sdk: Sdk): Client {
  return clients.find(c => c.id === sdk)!;
}

/** The variant shown for a client on a page that has the given variants. Spring Boot uses the Java client. */
export function contentSdk(sdk: Sdk, available: readonly Sdk[] = defaultContentSdks): Sdk {
  if (available.includes(sdk)) return sdk;
  if (sdk === 'spring' && available.includes('java')) return 'java';
  return 'php';
}

export function hasOwnExamples(sdk: Sdk, available: readonly Sdk[] = defaultContentSdks): boolean {
  return contentSdk(sdk, available) !== 'php' || sdk === 'php' || sdk === 'laravel';
}

/** The language of a client's code blocks. */
export type CodeLanguage = 'php' | 'java' | 'ts';
export function codeLanguage(sdk: Sdk): CodeLanguage {
  if (sdk === 'java' || sdk === 'spring') return 'java';
  if (sdk === 'js') return 'ts';
  return 'php';
}

/**
 * Writes a PHP method reference, like `$browser->_keys($selector, $keys = [])`, as the Java and JavaScript clients
 * call it: `browser.keys(selector, keys = [])`. Their methods have no underscore prefix.
 */
export function clientCall(php: string, sdk: Sdk): string {
  if (codeLanguage(sdk) === 'php') return php;
  return php
    .replace(/\$(\w+)->_?/g, '$1.')
    .replace(/->_?/g, '.')
    .replace(/\$(\w+)/g, '$1');
}

export function pageSdks(frontmatter: { sdks?: unknown }): readonly Sdk[] {
  const listed = Array.isArray(frontmatter.sdks) ? frontmatter.sdks.filter(isSdk) : [];
  return [...new Set([...defaultContentSdks, ...listed])];
}

export function isDocsPath(path: string): boolean {
  return /\/(guide|api)\//.test(path);
}

/** The client a page is fixed to, or undefined for shared pages. */
export function pageSdk(path: string): Sdk | undefined {
  const normalized = path.replace(/\.html$/, '').replace(/\/$/, '');
  const page = Object.keys(clientPages).find(candidate => normalized.endsWith(candidate));
  return page ? clientPages[page] : undefined;
}

export function isLaravelPage(path: string): boolean {
  return pageSdk(path) === 'laravel';
}

/** The SDK a URL asks for, or undefined when it does not choose one. */
export function sdkParam(url: URL): Sdk | undefined {
  const fixed = pageSdk(url.pathname);
  if (fixed) return fixed;
  if (!url.searchParams.has('sdk')) return undefined;
  const value = url.searchParams.get('sdk');
  return isSdk(value) ? value : 'laravel';
}

export function sdkFromUrl(url: URL): Sdk {
  return sdkParam(url) ?? 'laravel';
}

export function sdkHref(href: string, current: Sdk, origin: string): string {
  const url = new URL(href, origin);
  if (url.origin !== new URL(origin).origin || !isDocsPath(url.pathname)) return href;
  const sdk = pageSdk(url.pathname)
    ?? (url.searchParams.has('sdk') ? sdkFromUrl(url) : current);
  url.searchParams.set('sdk', sdk);
  return url.pathname + url.search + url.hash;
}
