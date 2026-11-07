// Runs in the page. Returns JSON so the result does not depend on how values are transported.
export const inspectScript = (maxText: number, maxElements: number) => `(() => {
    const clean = (value, limit = 120) => (value ?? '').replace(/\\s+/g, ' ').trim().slice(0, limit);
    const quote = (value) => value.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
    const unique = (selector) => {
        try {
            return document.querySelectorAll(selector).length === 1;
        } catch {
            return false;
        }
    };
    const candidates = (element) => {
        const found = [];
        const add = (selector, stability) => {
            if (unique(selector)) {
                found.push({ selector, stability });
            }
        };
        const attribute = (name) => element.getAttribute(name);
        if (attribute('puth')) add('[puth="' + quote(attribute('puth')) + '"]', 'stable');
        if (attribute('data-testid')) add('[data-testid="' + quote(attribute('data-testid')) + '"]', 'stable');
        if (element.id) add('#' + CSS.escape(element.id), 'medium');
        if (attribute('name')) add(element.tagName.toLowerCase() + '[name="' + quote(attribute('name')) + '"]', 'medium');
        if (attribute('aria-label')) add('[aria-label="' + quote(attribute('aria-label')) + '"]', 'medium');
        if (element.tagName === 'A' && attribute('href')) add('a[href="' + quote(attribute('href')) + '"]', 'weak');

        const index = [...element.parentElement.children].indexOf(element) + 1;
        const parent = element.parentElement.id ? '#' + CSS.escape(element.parentElement.id) + ' > ' : '';
        add(parent + element.tagName.toLowerCase() + ':nth-child(' + index + ')', 'weak');

        return found;
    };

    const interactive = 'a[href], button, input, select, textarea, summary, [role=button], [role=link], [puth], [data-testid]';
    const visible = [...document.querySelectorAll(interactive)].filter((element) => element.checkVisibility());

    return JSON.stringify({
        url: location.href,
        title: document.title,
        text: clean(document.body?.innerText, ${maxText}),
        textTruncated: (document.body?.innerText.length ?? 0) > ${maxText},
        totalElements: visible.length,
        elements: visible.slice(0, ${maxElements}).map((element) => ({
            tag: element.tagName.toLowerCase(),
            type: element.getAttribute('type') ?? undefined,
            text: clean(element.innerText || element.value || element.getAttribute('aria-label') || element.getAttribute('placeholder')),
            disabled: element.disabled === true || undefined,
            selectors: candidates(element),
        })),
    });
})()`;
