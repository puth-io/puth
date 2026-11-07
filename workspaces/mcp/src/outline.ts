// Runs in the page. One line per thing an agent can read or use, in document order, so it doubles as page structure.
export const outlineScript = (scope: string|null) => `(() => {
    const clean = (value, limit = 80) => {
        const text = (value ?? '').replace(/\\s+/g, ' ').trim();
        return text.length > limit ? text.slice(0, limit) + '…' : text;
    };
    const quote = (value) => value.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
    const unique = (selector) => {
        try {
            return document.querySelectorAll(selector).length === 1;
        } catch {
            return false;
        }
    };
    const selectorOf = (element) => {
        const tag = element.tagName.toLowerCase();
        const attribute = (name) => element.getAttribute(name);
        const candidates = [
            attribute('puth') && '[puth="' + quote(attribute('puth')) + '"]',
            attribute('data-testid') && '[data-testid="' + quote(attribute('data-testid')) + '"]',
            element.id && '#' + CSS.escape(element.id),
            attribute('name') && tag + '[name="' + quote(attribute('name')) + '"]',
            attribute('aria-label') && tag + '[aria-label="' + quote(attribute('aria-label')) + '"]',
            tag === 'a' && attribute('href') && 'a[href="' + quote(attribute('href')) + '"]',
        ];
        const found = candidates.find((selector) => selector && unique(selector));
        if (found) {
            return found;
        }

        // Weak: position based, so it is marked for whoever writes a test with it.
        const parts = [];
        for (let current = element; current && current !== document.body; current = current.parentElement) {
            if (current.id) {
                parts.unshift('#' + CSS.escape(current.id));
                break;
            }
            parts.unshift(current.tagName.toLowerCase() + ':nth-child(' + ([...current.parentElement.children].indexOf(current) + 1) + ')');
        }
        return '~' + parts.join('>');
    };
    const labelOf = (element) => clean(
        element.labels?.[0]?.innerText
        || element.getAttribute('aria-label')
        || (element.getAttribute('aria-labelledby') && document.getElementById(element.getAttribute('aria-labelledby'))?.innerText)
        || (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) ? '' : element.innerText)
        || element.getAttribute('placeholder')
        || element.getAttribute('title')
        || (element.tagName === 'SELECT' ? '' : element.value),
    );
    const lineOf = (element) => {
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute('role');

        if (/^h[1-3]$/.test(tag)) {
            return '#'.repeat(Number(tag[1])) + ' ' + clean(element.innerText);
        }
        if (role === 'alert' || role === 'status') {
            return '! ' + clean(element.innerText, 200);
        }

        const flags = [];
        if (element.disabled) flags.push('disabled');
        if (element.required) flags.push('required');
        if (element.readOnly) flags.push('readonly');
        if (element.checked) flags.push('checked');

        let kind = role ?? (tag === 'a' ? 'link' : tag);
        let value = '';
        if (tag === 'input') {
            kind = 'input:' + (element.getAttribute('type') ?? 'text');
            if (element.type !== 'password' && element.type !== 'checkbox' && element.type !== 'radio' && element.value) {
                value = ' =' + JSON.stringify(clean(element.value, 40));
            }
        } else if (tag === 'textarea' && element.value) {
            value = ' =' + JSON.stringify(clean(element.value, 40));
        } else if (tag === 'select') {
            const options = [...element.options].map((option) => clean(option.value || option.text, 20));
            value = ' =' + JSON.stringify(clean(element.selectedOptions[0]?.value, 20)) + ' of ' + options.slice(0, 8).join('|') + (options.length > 8 ? '|…' : '');
        }

        return [kind, JSON.stringify(labelOf(element)), selectorOf(element) + value, ...flags].join(' ');
    };

    const root = ${scope === null ? 'document' : `document.querySelector(${JSON.stringify(scope)})`};
    if (root === null) {
        return JSON.stringify({ missing: true });
    }

    const wanted = 'h1, h2, h3, [role=alert], [role=status], a[href], button, input:not([type=hidden]), select, textarea, summary, '
        + '[role=button], [role=link], [role=tab], [role=checkbox], [role=menuitem], [puth], [data-testid]';

    return JSON.stringify({
        url: location.href,
        title: document.title,
        lines: [...root.querySelectorAll(wanted)]
            .filter((element) => element.checkVisibility())
            .map(lineOf)
            .filter((line, index, lines) => lines.indexOf(line) === index),
        texts: (document.body?.innerText ?? '').split('\\n')
            .map((text) => clean(text, 120))
            .filter((text, index, texts) => text !== '' && texts.indexOf(text) === index)
            .slice(0, 500),
    });
})()`;

export const textScript = (scope: string|null) =>
    `(${scope === null ? 'document.body' : `document.querySelector(${JSON.stringify(scope)})`})?.innerText ?? ''`;

export const MAX_CHANGES = 15;

type Outline = { lines: string[], texts: string[] };

/**
 * Everything on a page whose appearance is worth reporting: the outline, and visible text that is not part of it.
 */
export const observableLines = ({ lines, texts }: Outline) => [
    ...lines,
    ...texts.filter(text => ! lines.some(line => line.includes(text))).map(text => JSON.stringify(text)),
];

/**
 * Lines that appeared and disappeared. This is usually all an agent needs to know after acting on a page.
 */
export function outlineChanges(before: string[], after: string[]): string[] {
    const previous = new Set(before);
    const current = new Set(after);
    const changes = [
        ...after.filter(line => ! previous.has(line)).map(line => `+ ${line}`),
        ...before.filter(line => ! current.has(line)).map(line => `- ${line}`),
    ];

    return changes.length > MAX_CHANGES
        ? [...changes.slice(0, MAX_CHANGES), `… ${changes.length - MAX_CHANGES} more changes, see puth_inspect`]
        : changes;
}
