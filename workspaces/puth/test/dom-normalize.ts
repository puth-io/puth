// Serializes a document for comparison, without what the replay leaves out on purpose: script contents, event
// handler attributes, attribute names setAttribute rejects, and the replay's own base element.
export const NORMALIZE = String.raw`(doc) => {
    const NO_CHILDREN = new Set(['script', 'noscript', 'template', 'iframe', 'frame', 'object', 'embed']);
    const VALID = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;
    const out = [];
    const walk = (node, depth) => {
        const pad = ' '.repeat(depth);
        if (node.nodeType === 3) { out.push(pad + '#text ' + JSON.stringify(node.data)); return; }
        if (node.nodeType === 8) { out.push(pad + '#comment ' + JSON.stringify(node.data)); return; }
        if (node.nodeType !== 1 || node.localName === 'base') return;
        const attributes = [...node.attributes]
            .map((a) => [a.name.replace(/^data-puth-replay-/, ''), a.value])
            .filter(([name]) => VALID.test(name) && ! name.toLowerCase().startsWith('on'))
            .sort((a, b) => a[0] < b[0] ? -1 : 1)
            .map(([name, value]) => name + '=' + JSON.stringify(value));
        let line = pad + '<' + node.tagName.toLowerCase() + (attributes.length ? ' ' + attributes.join(' ') : '') + '>';
        if (['input', 'textarea', 'select'].includes(node.localName)) {
            line += ' value=' + JSON.stringify(node.value) + (node.localName === 'input' ? ' checked=' + node.checked : '')
                + (node.localName === 'select' ? ' index=' + node.selectedIndex + ' selected=' + [...node.options].filter((option) => option.selected).map((option) => option.index).join(',') : '');
        }
        // Rules count, not how they got there: the replay writes rules added through the CSSOM as text.
        if (node.localName === 'style') {
            out.push(line + ' css=' + JSON.stringify([...node.sheet.cssRules].map((rule) => rule.cssText).join('\n')));
            return;
        }
        out.push(line);
        if (NO_CHILDREN.has(node.localName) && node.namespaceURI === 'http://www.w3.org/1999/xhtml') return;
        for (const child of node.childNodes) walk(child, depth + 1);
    };
    walk(doc.documentElement, 0);
    return out.join('\n');
}`;
