/**
 * Records the DOM of a document, injected at document start into an isolated world of every frame. The isolated
 * world shares the DOM with the page but none of its globals, so the page can neither see nor break the recorder,
 * and the recorder reads only native DOM properties.
 *
 * Messages go out through the binding __puthDom as JSON, in order, each with the document's id and a sequence
 * number. The format is described in @puth/core (Dom.ts).
 *
 * Consistency: the keyframe is taken in the same task that clears the observer's queue, so no change can fall
 * between them. Batches carry the current state of what changed, not the records' history, because records arrive
 * after the fact.
 *
 * Size: nodes are flat token lists, and strings go into a table of the document once they repeat, which every
 * message extends with what it added. Tag and attribute names go in right away, there are few of them.
 *
 * Kept as a string: tsx and pkgroll wrap named functions in a helper that only exists on the server.
 */
export const DOM_RECORDER_SOURCE = String.raw`(() => {
    const send = globalThis.__puthDom;
    if (globalThis.__puthRecorder || typeof send !== 'function') {
        return;
    }

    const doc = document;
    const docId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    const SVG = 'http://www.w3.org/2000/svg';
    const MATHML = 'http://www.w3.org/1998/Math/MathML';
    const NO_CHILDREN = new Set(['script', 'noscript', 'template', 'iframe', 'frame', 'object', 'embed']);
    const CONTROLS = new Set(['input', 'textarea', 'select']);
    const BATCH_DELAY = 50;
    const MAX_RECORDS = 20000;
    const MIN_KEYFRAME_DISTANCE = 128 * 1024;
    // Longer strings rarely repeat. Strings seen once are only remembered up to a limit.
    const MAX_TABLE_STRING = 200;
    const MAX_SEEN_ONCE = 20000;

    const ids = new WeakMap();
    let nextId = 1;
    let seq = 0;
    let started = false;
    let records = [];
    let overflow = false;
    let timer = 0;
    let keyframeSize = 0;
    let sinceKeyframe = 0;
    // Form controls and <style> elements whose state can change without a mutation record.
    const controls = new Map();
    const styles = new Map();
    // Elements that scrolled once, and what was sent last. Scroll and resize events only fire with the next frame,
    // so positions and the viewport are compared on every flush instead.
    const scrollers = new Map();
    const scrollSent = new Map();
    let viewportSent = '';

    // The document's string table, started anew with every keyframe. A string slot holds the index of a string in
    // it, or the string itself.
    let table = new Map();
    let added = [];
    let seenOnce = new Set();
    const resetTable = () => {
        table = new Map();
        added = [];
        seenOnce = new Set();
    };
    const name = (string) => {
        let index = table.get(string);
        if (index === undefined) {
            index = table.size;
            table.set(string, index);
            added.push(string);
        }
        return index;
    };
    // A string that isn't a name goes into the table on its second occurrence, so unique ones never take a slot.
    const string = (value) => {
        const index = table.get(value);
        if (index !== undefined) {
            return index;
        }
        if (value.length > MAX_TABLE_STRING) {
            return value;
        }
        if (seenOnce.has(value)) {
            seenOnce.delete(value);
            return name(value);
        }
        if (seenOnce.size >= MAX_SEEN_ONCE) {
            seenOnce.clear();
        }
        seenOnce.add(value);
        return value;
    };

    const idOf = (node) => {
        let id = ids.get(node);
        if (id === undefined) {
            id = nextId++;
            ids.set(node, id);
        }
        return id;
    };

    // Frames of another origin than a page above them, like payment fields, have every typed value masked.
    const crossOrigin = (() => {
        const ancestors = location.ancestorOrigins || [];
        for (let i = 0; i < ancestors.length; i++) {
            if (ancestors[i] !== location.origin) {
                return true;
            }
        }
        return false;
    })();
    const UNTYPED = new Set(['checkbox', 'radio', 'submit', 'button', 'reset', 'hidden', 'image', 'file', 'color', 'range']);
    const masked = (element) => element.localName === 'input'
        ? element.type === 'password' || /(^|\s)cc-/.test(element.getAttribute('autocomplete') || '') || (crossOrigin && ! UNTYPED.has(element.type))
        : crossOrigin && element.localName === 'textarea';

    // [value, checked, selectedIndex, selected options of a multiple select]
    const controlState = (element) => {
        const value = element.value;
        const select = element.localName === 'select';
        let selected = null;
        if (select && element.multiple) {
            selected = [];
            for (let i = 0; i < element.options.length; i++) {
                if (element.options[i].selected) selected.push(i);
            }
        }
        return [
            masked(element) ? '\u2022'.repeat(value.length) : value,
            element.localName === 'input' ? element.checked : null,
            select && selected === null ? element.selectedIndex : null,
            selected,
        ];
    };

    const rules = (element) => {
        try {
            return element.sheet ? element.sheet.cssRules : null;
        } catch (error) {
            return null;
        }
    };
    // A sheet whose rules a script changed has another count, or another first or last rule.
    const sheetKey = (list) => list === null || list.length === 0
        ? '0'
        : list.length + '|' + list[0].cssText + '|' + list[list.length - 1].cssText;
    const cssOf = (list) => {
        let css = '';
        for (let i = 0; i < list.length; i++) {
            css += list[i].cssText + '\n';
        }
        return css;
    };

    // Pairs of name and value; a masked input never shows its value attribute either.
    const attributesOf = (element, out) => {
        const attributes = element.attributes;
        const hide = element.localName === 'input' && masked(element);
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i];
            out.push(name(attribute.name), hide && attribute.name === 'value' ? '\u2022'.repeat(attribute.value.length) : string(attribute.value));
        }
        return out;
    };

    // Appends a node in pre-order and returns whether it did; other node types are left out.
    //   element:            id, 1, tag, namespace, attribute count, (name, value)..., props, child count, children...
    //   text and comment:   id, 3 or 8, data
    //   doctype:            id, 10, name, public id, system id
    // Every node it serializes goes into fresh, so changes inside it aren't sent again in the same batch.
    const serialize = (node, fresh, out) => {
        const type = node.nodeType;
        if (type === 3 || type === 8) {
            fresh && fresh.add(node);
            out.push(idOf(node), type, string(node.data));
            return true;
        }
        if (type === 10) {
            fresh && fresh.add(node);
            out.push(idOf(node), 10, string(node.name), string(node.publicId), string(node.systemId));
            return true;
        }
        if (type !== 1) {
            return false;
        }

        fresh && fresh.add(node);
        const id = idOf(node);
        const tag = node.localName;
        const namespace = node.namespaceURI === SVG ? 1 : node.namespaceURI === MATHML ? 2 : 0;
        out.push(id, 1, name(namespace === 0 ? tag : node.tagName), namespace, node.attributes.length);
        attributesOf(node, out);

        let props = 0;
        if (namespace === 0 && CONTROLS.has(tag)) {
            const state = controlState(node);
            controls.set(id, [node, JSON.stringify(state)]);
            props = {value: state[0]};
            if (state[1] !== null) props.checked = state[1];
            if (state[2] !== null) props.selectedIndex = state[2];
            if (state[3] !== null) props.selected = state[3];
        } else if (namespace === 0 && tag === 'style') {
            const list = rules(node);
            const count = list ? list.length : 0;
            styles.set(id, [node, sheetKey(list)]);
            // Rules a script inserted through the CSSOM, which leave the element's text empty.
            if (count > 0 && node.textContent.trim() === '') {
                props = {css: cssOf(list)};
            }
        }
        out.push(props);

        const countAt = out.length;
        out.push(0);
        let count = 0;
        if (namespace !== 0 || ! NO_CHILDREN.has(tag)) {
            for (let child = node.firstChild; child !== null; child = child.nextSibling) {
                if (serialize(child, fresh, out)) {
                    count++;
                }
            }
        }
        out[countAt] = count;
        return true;
    };

    const viewport = () => [window.innerWidth, window.innerHeight, window.devicePixelRatio];

    // Scroll positions that changed since they were sent, or all of them for a keyframe. Id 0 is the window.
    const scrollChanges = (all) => {
        const changed = [];
        const check = (id, x, y) => {
            const key = x + ',' + y;
            if (all || scrollSent.get(id) !== key) {
                scrollSent.set(id, key);
                changed.push([id, x, y]);
            }
        };
        check(0, window.scrollX, window.scrollY);
        for (const [id, element] of scrollers) {
            if (! element.isConnected) {
                scrollers.delete(id);
                scrollSent.delete(id);
            } else {
                check(id, element.scrollLeft, element.scrollTop);
            }
        }
        return changed;
    };

    const post = (kind, data) => {
        seq++;
        const packet = {kind: kind, doc: docId, seq: seq, data: data};
        if (added.length > 0) {
            packet.strings = added;
            added = [];
        }
        const message = JSON.stringify(packet);
        if (kind === 'keyframe') {
            keyframeSize = message.length;
            sinceKeyframe = 0;
        } else {
            sinceKeyframe += message.length;
        }
        send(message);
    };

    const keyframe = () => {
        observer.takeRecords();
        records = [];
        overflow = false;
        controls.clear();
        styles.clear();
        resetTable();

        // A list of nodes: their count, then the nodes.
        const root = [0];
        for (let child = doc.firstChild; child !== null; child = child.nextSibling) {
            if (serialize(child, null, root)) {
                root[0]++;
            }
        }

        const scroll = scrollChanges(true);
        const size = viewport();
        viewportSent = size.join(',');

        post('keyframe', {
            url: location.href,
            base: doc.baseURI,
            document: idOf(doc),
            root: root,
            viewport: size,
            scroll: scroll,
        });
    };

    const inDocumentOrder = (a, b) => a === b ? 0 : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

    const changes = () => {
        const list = records.concat(observer.takeRecords());
        records = [];

        const parents = new Set();
        const addedNodes = new Set();
        const attributes = new Set();
        const texts = new Set();
        for (const record of list) {
            if (record.type === 'childList') {
                parents.add(record.target);
                for (const node of record.addedNodes) {
                    addedNodes.add(node);
                }
            } else if (record.type === 'attributes') {
                attributes.add(record.target);
            } else {
                texts.add(record.target);
            }
        }

        const ops = [];
        const fresh = new Set();
        const known = (node) => node.isConnected && ids.has(node) && ! fresh.has(node);

        // Parents first, so a subtree that is serialized again covers the changes inside it.
        const changed = [...parents].filter(known).sort(inDocumentOrder);
        for (const parent of changed) {
            if (fresh.has(parent) || (parent.nodeType === 1 && parent.namespaceURI !== SVG && parent.namespaceURI !== MATHML && NO_CHILDREN.has(parent.localName))) {
                continue;
            }
            // A list of children: a node the replay has already is its negative id, a new one is serialized.
            const children = [0];
            for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
                if (ids.has(child) && ! addedNodes.has(child)) {
                    children.push(-ids.get(child));
                    children[0]++;
                } else if (serialize(child, fresh, children)) {
                    children[0]++;
                }
            }
            ops.push([1, ids.get(parent), children]);
        }
        for (const element of attributes) {
            if (known(element)) {
                ops.push([2, ids.get(element), attributesOf(element, [])]);
            }
        }
        for (const node of texts) {
            if (known(node) && ! (node.parentNode && node.parentNode.localName === 'script')) {
                ops.push([3, ids.get(node), string(node.data)]);
            }
        }

        // Values typed or set from code, and CSSOM rules, change without a mutation record.
        for (const [id, entry] of controls) {
            const element = entry[0];
            if (! element.isConnected) {
                controls.delete(id);
                continue;
            }
            const state = controlState(element);
            const key = JSON.stringify(state);
            if (key !== entry[1]) {
                entry[1] = key;
                if (! fresh.has(element)) {
                    ops.push([4, id, state[0], state[1], state[2], state[3]]);
                }
            }
        }
        for (const [id, entry] of styles) {
            const element = entry[0];
            if (! element.isConnected) {
                styles.delete(id);
                continue;
            }
            const list = rules(element);
            const key = sheetKey(list);
            if (key !== entry[1]) {
                entry[1] = key;
                if (! fresh.has(element)) {
                    ops.push([6, id, list ? cssOf(list) : '']);
                }
            }
        }

        for (const [id, x, y] of scrollChanges(false)) {
            ops.push([7, id, x, y]);
        }
        const size = viewport();
        if (size.join(',') !== viewportSent) {
            viewportSent = size.join(',');
            ops.push([8].concat(size));
        }

        return ops;
    };

    const start = () => {
        if (started) {
            return false;
        }
        started = true;
        observer.observe(doc, {childList: true, attributes: true, characterData: true, subtree: true});
        keyframe();
        return true;
    };

    // Sends what changed since the last flush. Returns where the recording stands afterwards.
    const flush = () => {
        clearTimeout(timer);
        timer = 0;
        listen();
        if (! start()) {
            if (overflow) {
                keyframe();
            } else {
                const ops = changes();
                // Once the changes since the last keyframe grow larger than one, a keyframe replaces them: it is
                // smaller, and the GUI starts there when it jumps.
                if (ops.length > 0 && sinceKeyframe + JSON.stringify(ops).length > Math.max(keyframeSize, MIN_KEYFRAME_DISTANCE)) {
                    keyframe();
                } else if (ops.length > 0) {
                    post('changes', ops);
                }
            }
        }
        return {doc: docId, seq: seq};
    };

    const schedule = () => {
        if (started && timer === 0) {
            timer = setTimeout(() => flush(), BATCH_DELAY);
        }
    };

    const observer = new MutationObserver((list) => {
        if (overflow) {
            return;
        }
        if (records.length + list.length > MAX_RECORDS) {
            // A page that changes too much at once gets a new keyframe instead of its records.
            overflow = true;
            records = [];
        } else {
            for (const record of list) {
                records.push(record);
            }
        }
        schedule();
    });

    const onScroll = (event) => {
        if (event.target !== doc && event.target.nodeType === 1) {
            scrollers.set(idOf(event.target), event.target);
        }
        schedule();
    };
    const onResize = schedule;
    // A navigation sends what changed last. Only beforeunload is early enough: a binding call during pagehide or
    // unload no longer reaches Puth, because the navigation committed already.
    const onLeave = () => flush();
    // document.open(), which Puppeteer's setContent uses, removes every listener of the window. Adding the same
    // listener again does nothing, so each flush adds them back.
    const listen = () => {
        addEventListener('scroll', onScroll, {capture: true, passive: true});
        addEventListener('resize', onResize);
        addEventListener('input', schedule, {capture: true});
        addEventListener('change', schedule, {capture: true});
        addEventListener('beforeunload', onLeave, {capture: true});
        addEventListener('pagehide', onLeave, {capture: true});
    };
    listen();

    globalThis.__puthRecorder = {
        flush: flush,
        resync: () => {
            start();
            keyframe();
            return {doc: docId, seq: seq};
        },
        doc: docId,
        // Ids for nodes Puth asks about, like the iframe a frame is shown in. Nodes not recorded yet keep it.
        idOf: idOf,
    };

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', () => start(), {once: true});
    } else {
        start();
    }
})()`;
