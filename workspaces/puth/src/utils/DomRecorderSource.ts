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
    const scrolled = new Map();
    let resized = false;

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

    const controlState = (element) => {
        const value = element.value;
        return [
            masked(element) ? '•'.repeat(value.length) : value,
            element.localName === 'input' ? element.checked : null,
            element.localName === 'select' ? element.selectedIndex : null,
        ];
    };

    const rules = (element) => {
        try {
            return element.sheet ? element.sheet.cssRules : null;
        } catch (error) {
            return null;
        }
    };
    const cssOf = (list) => {
        let css = '';
        for (let i = 0; i < list.length; i++) {
            css += list[i].cssText + '\n';
        }
        return css;
    };

    const attributesOf = (element) => {
        const list = [];
        for (const attribute of element.attributes) {
            if (element.localName === 'input' && attribute.name === 'value' && masked(element)) {
                list.push('value', '•'.repeat(attribute.value.length));
            } else {
                list.push(attribute.name, attribute.value);
            }
        }
        return list;
    };

    // Every node it serializes goes into fresh, so changes inside it aren't sent again in the same batch.
    const serialize = (node, fresh) => {
        const type = node.nodeType;
        if (type === 3 || type === 8) {
            fresh && fresh.add(node);
            return [idOf(node), type, node.data];
        }
        if (type === 10) {
            fresh && fresh.add(node);
            return [idOf(node), 10, node.name, node.publicId, node.systemId];
        }
        if (type !== 1) {
            return null;
        }

        fresh && fresh.add(node);
        const id = idOf(node);
        const name = node.localName;
        const namespace = node.namespaceURI === SVG ? 1 : node.namespaceURI === MATHML ? 2 : 0;
        const children = [];
        if (namespace !== 0 || ! NO_CHILDREN.has(name)) {
            for (let child = node.firstChild; child !== null; child = child.nextSibling) {
                const serialized = serialize(child, fresh);
                if (serialized !== null) {
                    children.push(serialized);
                }
            }
        }

        let props = 0;
        if (namespace === 0 && CONTROLS.has(name)) {
            const state = controlState(node);
            controls.set(id, [node, state]);
            props = {value: state[0]};
            if (state[1] !== null) props.checked = state[1];
            if (state[2] !== null) props.selectedIndex = state[2];
        } else if (namespace === 0 && name === 'style') {
            const list = rules(node);
            const count = list ? list.length : 0;
            styles.set(id, [node, count]);
            // Rules a script inserted through the CSSOM, which leave the element's text empty.
            if (count > 0 && node.textContent.trim() === '') {
                props = {css: cssOf(list)};
            }
        }

        return [id, 1, namespace === 0 ? name : node.tagName, attributesOf(node), children, props, namespace];
    };

    const viewport = () => [window.innerWidth, window.innerHeight, window.devicePixelRatio];

    const post = (kind, data, marker) => {
        seq++;
        const message = JSON.stringify({kind: kind, doc: docId, seq: seq, data: data, marker: marker});
        if (kind === 'keyframe') {
            keyframeSize = message.length;
            sinceKeyframe = 0;
        } else {
            sinceKeyframe += message.length;
        }
        send(message);
    };

    const keyframe = (marker) => {
        observer.takeRecords();
        records = [];
        overflow = false;
        resized = false;
        controls.clear();
        styles.clear();

        const root = [];
        for (let child = doc.firstChild; child !== null; child = child.nextSibling) {
            const serialized = serialize(child, null);
            if (serialized !== null) {
                root.push(serialized);
            }
        }

        const scroll = [[0, window.scrollX, window.scrollY]];
        for (const [id, element] of scrolled) {
            if (element.isConnected) {
                scroll.push([id, element.scrollLeft, element.scrollTop]);
            } else {
                scrolled.delete(id);
            }
        }
        scrolled.clear();

        post('keyframe', {
            url: location.href,
            base: doc.baseURI,
            document: idOf(doc),
            root: root,
            viewport: viewport(),
            scroll: scroll,
        }, marker);
    };

    const inDocumentOrder = (a, b) => a === b ? 0 : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

    const changes = () => {
        const list = records.concat(observer.takeRecords());
        records = [];

        const parents = new Set();
        const added = new Set();
        const attributes = new Set();
        const texts = new Set();
        for (const record of list) {
            if (record.type === 'childList') {
                parents.add(record.target);
                for (const node of record.addedNodes) {
                    added.add(node);
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
            const children = [];
            for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
                if (ids.has(child) && ! added.has(child)) {
                    children.push(ids.get(child));
                } else {
                    const serialized = serialize(child, fresh);
                    if (serialized !== null) {
                        children.push(serialized);
                    }
                }
            }
            ops.push([1, ids.get(parent), children]);
        }
        for (const element of attributes) {
            if (known(element)) {
                ops.push([2, ids.get(element), attributesOf(element)]);
            }
        }
        for (const node of texts) {
            if (known(node) && ! (node.parentNode && node.parentNode.localName === 'script')) {
                ops.push([3, ids.get(node), node.data]);
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
            const last = entry[1];
            if (state[0] !== last[0] || state[1] !== last[1] || state[2] !== last[2]) {
                entry[1] = state;
                if (! fresh.has(element)) {
                    ops.push([4, id, state[0], state[1], state[2]]);
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
            const count = list ? list.length : 0;
            if (count !== entry[1]) {
                entry[1] = count;
                if (! fresh.has(element)) {
                    ops.push([6, id, list ? cssOf(list) : '']);
                }
            }
        }

        for (const [id, element] of scrolled) {
            if (element === window) {
                ops.push([7, 0, window.scrollX, window.scrollY]);
            } else if (element.isConnected && ids.has(element)) {
                ops.push([7, id, element.scrollLeft, element.scrollTop]);
            }
        }
        scrolled.clear();
        if (resized) {
            resized = false;
            ops.push([8].concat(viewport()));
        }

        return ops;
    };

    const start = (marker) => {
        if (started) {
            return false;
        }
        started = true;
        observer.observe(doc, {childList: true, attributes: true, characterData: true, subtree: true});
        keyframe(marker);
        return true;
    };

    // Sends what changed since the last flush. Returns where the recording stands afterwards.
    const flush = (marker) => {
        clearTimeout(timer);
        timer = 0;
        listen();
        if (! start(marker)) {
            if (overflow) {
                keyframe(marker);
            } else {
                const ops = changes();
                // Once the changes since the last keyframe grow larger than one, a keyframe replaces them: it is
                // smaller, and the GUI starts there when it jumps.
                if (ops.length > 0 && sinceKeyframe + JSON.stringify(ops).length > Math.max(keyframeSize, MIN_KEYFRAME_DISTANCE)) {
                    keyframe(marker);
                } else if (ops.length > 0) {
                    post('changes', ops, marker);
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
        const target = event.target === doc ? window : event.target;
        scrolled.set(target === window ? 0 : idOf(target), target);
        schedule();
    };
    const onResize = () => {
        resized = true;
        schedule();
    };
    // A navigation sends what changed last. Only beforeunload is early enough: a binding call during pagehide or
    // unload no longer reaches Puth, because the navigation committed already.
    const onLeave = () => flush('leave');
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
            keyframe('resync');
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
