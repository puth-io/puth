export type Sdk = 'laravel' | 'php';
export const laravelPages = new Set([
  '/guide/laravel', '/guide/laravel-cookies', '/guide/laravel-debugging',
  '/guide/migration-from-dusk',
]);

export function isDocsPath(path: string): boolean {
  return /\/(guide|api)\//.test(path);
}

export function isLaravelPage(path: string): boolean {
  const normalized = path.replace(/\.html$/, '').replace(/\/$/, '');
  return [...laravelPages].some(page => normalized.endsWith(page));
}

export function sdkFromUrl(url: URL): Sdk {
  return isLaravelPage(url.pathname) || url.searchParams.get('sdk') !== 'php' ? 'laravel' : 'php';
}

export function sdkHref(href: string, current: Sdk, origin: string): string {
  const url = new URL(href, origin);
  if (url.origin !== new URL(origin).origin || !isDocsPath(url.pathname)) return href;
  const sdk = isLaravelPage(url.pathname) ? 'laravel'
    : url.searchParams.has('sdk') ? sdkFromUrl(url) : current;
  url.searchParams.set('sdk', sdk);
  return url.pathname + url.search + url.hash;
}
