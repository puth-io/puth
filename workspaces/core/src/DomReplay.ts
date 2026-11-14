import {type DomChange, type DomKeyframe, DomNodeType, DomOp, type DomProps, type DomScroll, type DomString, type DomTokens, type DomViewport} from './Dom';

const NAMESPACES = ['http://www.w3.org/1999/xhtml', 'http://www.w3.org/2000/svg', 'http://www.w3.org/1998/Math/MathML'];
const XLINK = 'http://www.w3.org/1999/xlink';

// Attributes the replay never applies as they are, because they would load, navigate or run something.
const REWRITTEN_PREFIX = 'data-puth-replay-';
const NO_CHILDREN = new Set(['script', 'noscript', 'template', 'iframe', 'frame', 'object', 'embed']);
const FRAMES = new Set(['iframe', 'frame']);
const STRIPPED_RELS = /(^|\s)(preconnect|dns-prefetch|prerender|prefetch|modulepreload)(\s|$)/i;

/**
 * Rebuilds a recorded document inside another document, like the GUI's replay frame. Uses only DOM APIs, so it runs
 * wherever a document exists.
 *
 * Nothing recorded may load or navigate on its own: iframes, scripts, plugins, refreshes and link hints are
 * neutralized while elements are created, before they are inserted.
 */
export class DomReplay {
    readonly doc: Document;
    private nodes: (Node|undefined)[] = [];
    private base: HTMLBaseElement;
    private own = new WeakSet<Node>();
    viewport: DomViewport = [0, 0, 1];
    // The document's string table, from the keyframe and the batches applied since.
    private strings: string[] = [];
    private scroll = new Map<number, [number, number]>();

    /**
     * frameSrc is the page recorded iframes load instead of their own, so a caller can build the documents they
     * showed into them. Without it, iframes stay empty.
     */
    constructor(doc: Document, private readonly options: {frameSrc?: string} = {}) {
        this.doc = doc;
        this.base = doc.createElement('base');
        this.own.add(this.base);
    }

    /** Rebuilds the document from a keyframe and the strings that came with it. */
    build(keyframe: DomKeyframe, strings: string[] = []) {
        const doc = this.doc;
        this.strings = strings.slice();
        this.nodes = [];
        this.nodes[keyframe.document] = doc;
        this.scroll.clear();

        // Images resolve their address when it is set, so the base must be live before the tree is created.
        this.base.href = keyframe.base;
        (doc.documentElement ?? doc).prepend(this.base);

        const children: Node[] = [];
        const tokens = keyframe.root;
        const cursor = {at: 1};
        for (let i = 0; i < (tokens[0] as number); i++) {
            const created = this.create(tokens, cursor);
            if (created !== null) {
                children.push(created);
            }
        }

        for (const child of [...doc.childNodes]) {
            if (child.nodeType !== DomNodeType.DOCTYPE) {
                doc.removeChild(child);
            }
        }
        // Move the base into the new tree before it is inserted, so stylesheets resolve against it as well.
        const html = children.find(node => node.nodeType === DomNodeType.ELEMENT);
        if (html !== undefined) {
            (html as Element).prepend(this.base);
        }
        for (const child of children) {
            doc.appendChild(child);
        }
        this.keepBase();

        this.viewport = keyframe.viewport;
        for (const [id, x, y] of keyframe.scroll) {
            this.scroll.set(id, [x, y]);
        }
    }

    /** Applies a batch of changes, with the strings it added to the table. */
    apply(changes: DomChange[], strings: string[] = []) {
        for (const string of strings) {
            this.strings.push(string);
        }
        for (const change of changes) {
            switch (change[0]) {
                case DomOp.CHILDREN:
                    this.setChildren(change[1], change[2]);
                    break;
                case DomOp.ATTRIBUTES: {
                    const element = this.nodes[change[1]];
                    if (element instanceof this.windowOf().Element) {
                        this.setAttributes(element, change[2]);
                    }
                    break;
                }
                case DomOp.TEXT: {
                    const node = this.nodes[change[1]];
                    if (node !== undefined && 'data' in node) {
                        (node as CharacterData).data = this.string(change[2]);
                    }
                    break;
                }
                case DomOp.CONTROL: {
                    const element = this.nodes[change[1]];
                    if (element !== undefined) {
                        this.setProps(element as Element, {
                            value: change[2] ?? undefined,
                            checked: change[3] ?? undefined,
                            selectedIndex: change[4] ?? undefined,
                            selected: change[5] ?? undefined,
                        });
                    }
                    break;
                }
                case DomOp.CSS: {
                    const element = this.nodes[change[1]];
                    if (element !== undefined) {
                        element.textContent = change[2];
                    }
                    break;
                }
                case DomOp.SCROLL:
                    this.scroll.set(change[1], [change[2], change[3]]);
                    break;
                case DomOp.VIEWPORT:
                    this.viewport = [change[1], change[2], change[3]];
                    break;
            }
        }
    }

    /** Scroll positions need layout, so they are restored once, after all changes are applied. */
    restoreScroll() {
        const window = this.doc.defaultView;
        for (const [id, [x, y]] of this.scroll) {
            if (id === 0) {
                window?.scrollTo(x, y);
                continue;
            }
            const element = this.nodes[id] as Element|undefined;
            if (element?.isConnected) {
                element.scrollLeft = x;
                element.scrollTop = y;
            }
        }
    }

    /** The iframe elements of the rebuilt document with their recorded ids. */
    frames(): [number, HTMLIFrameElement][] {
        const frames: [number, HTMLIFrameElement][] = [];
        this.nodes.forEach((node, id) => {
            if (node !== undefined && node.nodeType === DomNodeType.ELEMENT && FRAMES.has((node as Element).localName) && node.isConnected) {
                frames.push([id, node as HTMLIFrameElement]);
            }
        });
        return frames;
    }

    /** The node a recorded id stands for, like the target of a command. */
    nodeOf(id: number): Node|undefined {
        return this.nodes[id];
    }

    private windowOf(): typeof globalThis {
        return (this.doc.defaultView ?? globalThis) as typeof globalThis;
    }

    private string(value: DomString): string {
        return typeof value === 'number' ? this.strings[value] : value;
    }

    // Creates the node that starts at cursor.at and moves the cursor past it, its children included.
    private create(tokens: DomTokens, cursor: {at: number}): Node|null {
        const doc = this.doc;
        const id = tokens[cursor.at++] as number;
        const type = tokens[cursor.at++] as number;
        let created: Node;

        switch (type) {
            case DomNodeType.ELEMENT: {
                const tag = this.string(tokens[cursor.at++] as DomString);
                const namespace = tokens[cursor.at++] as number;
                const count = tokens[cursor.at++] as number;
                const attributes = tokens.slice(cursor.at, cursor.at + count * 2) as DomString[];
                cursor.at += count * 2;
                const props = tokens[cursor.at++] as DomProps|0;
                const children = tokens[cursor.at++] as number;

                let element: Element;
                try {
                    element = namespace ? doc.createElementNS(NAMESPACES[namespace], tag) : doc.createElement(tag);
                } catch {
                    // Names the parser accepts but createElement doesn't.
                    element = doc.createElement('puth-replay-unknown');
                }
                this.setAttributes(element, attributes);
                // The recorder sends no children for these, the count is still read.
                for (let i = 0; i < children; i++) {
                    const child = this.create(tokens, cursor);
                    if (child !== null && (namespace !== 0 || ! NO_CHILDREN.has(element.localName))) {
                        element.appendChild(child);
                    }
                }
                if (props) {
                    this.setProps(element, props);
                }
                created = element;
                break;
            }
            case DomNodeType.TEXT:
                created = doc.createTextNode(this.string(tokens[cursor.at++] as DomString));
                break;
            case DomNodeType.COMMENT:
                created = doc.createComment(this.string(tokens[cursor.at++] as DomString));
                break;
            default:
                // The replay document keeps its own doctype.
                cursor.at += 3;
                return null;
        }

        this.nodes[id] = created;
        return created;
    }

    private setChildren(parentId: number, children: DomTokens) {
        const parent = this.nodes[parentId];
        if (parent === undefined || (parent.nodeType === DomNodeType.ELEMENT && NO_CHILDREN.has((parent as Element).localName)
            && (parent as Element).namespaceURI === NAMESPACES[0])) {
            return;
        }

        const wanted: Node[] = [];
        const reader = {at: 1};
        for (let i = 0; i < (children[0] as number); i++) {
            const token = children[reader.at];
            // A negative id is a node the replay has already.
            const node = typeof token === 'number' && token < 0 ? this.nodes[-token] : this.create(children, reader);
            if (typeof token === 'number' && token < 0) {
                reader.at++;
            }
            if (node !== undefined && node !== null) {
                wanted.push(node);
            }
        }

        // Only what the recording knows is moved or removed; the replay's own nodes stay where they are.
        const keep = new Set(wanted);
        for (const child of [...parent.childNodes]) {
            if (! this.own.has(child) && ! keep.has(child) && child.nodeType !== DomNodeType.DOCTYPE) {
                parent.removeChild(child);
            }
        }
        let cursor = this.nextRecorded(parent.firstChild);
        for (const node of wanted) {
            if (node === cursor) {
                cursor = this.nextRecorded(cursor.nextSibling);
            } else {
                parent.insertBefore(node, cursor);
            }
        }

        if (parent === this.doc || parent === this.doc.documentElement) {
            this.keepBase();
        }
    }

    private nextRecorded(node: Node|null): Node|null {
        while (node !== null && (this.own.has(node) || node.nodeType === DomNodeType.DOCTYPE)) {
            node = node.nextSibling;
        }
        return node;
    }

    // The base must be the first in tree order, also after the recording replaced the root element.
    private keepBase() {
        const root = this.doc.documentElement;
        if (root !== null && root.firstChild !== this.base) {
            root.prepend(this.base);
        }
    }

    private setAttributes(element: Element, attributes: DomString[]) {
        const wanted = new Map<string, string>();
        for (let i = 0; i < attributes.length; i += 2) {
            const [name, value] = this.rewrite(element, this.string(attributes[i]), this.string(attributes[i + 1]));
            if (name !== null) {
                wanted.set(name, value);
            }
        }

        // The sandbox has to be in place before the frame navigates, which it does once src is set and it is inserted.
        if (this.options.frameSrc !== undefined && FRAMES.has(element.localName)) {
            wanted.delete('src');
            wanted.set('sandbox', 'allow-same-origin');
            wanted.set('src', this.options.frameSrc);
        }

        for (const attribute of [...element.attributes]) {
            if (! wanted.has(attribute.name)) {
                element.removeAttributeNode(attribute);
            }
        }
        for (const [name, value] of wanted) {
            if (element.getAttribute(name) === value) {
                continue;
            }
            try {
                if (name.startsWith('xlink:')) {
                    element.setAttributeNS(XLINK, name, value);
                } else {
                    element.setAttribute(name, value);
                }
            } catch {
                // Names like Alpine's @click are valid in HTML but not for setAttribute. They don't change how a page looks.
            }
        }
    }

    // Returns the attribute to set instead, or null to leave it out.
    private rewrite(element: Element, name: string, value: string): [string|null, string] {
        const tag = element.localName;
        const lower = name.toLowerCase();

        if (lower.startsWith('on')) {
            return [null, value];
        }
        // A recorded sandbox could make a frame's origin opaque, which the replay can't build into.
        if (FRAMES.has(tag) && (lower === 'src' || lower === 'srcdoc' || lower === 'sandbox')) {
            return [REWRITTEN_PREFIX + lower, value];
        }
        if ((tag === 'script' || tag === 'embed') && lower === 'src') {
            return [REWRITTEN_PREFIX + lower, value];
        }
        if (tag === 'object' && lower === 'data') {
            return [REWRITTEN_PREFIX + lower, value];
        }
        if (tag === 'base' && (lower === 'href' || lower === 'target')) {
            return [REWRITTEN_PREFIX + lower, value];
        }
        if (tag === 'meta' && lower === 'http-equiv' && value.toLowerCase() === 'refresh') {
            return [REWRITTEN_PREFIX + lower, value];
        }
        if (tag === 'link' && lower === 'rel' && STRIPPED_RELS.test(value)) {
            return [REWRITTEN_PREFIX + lower, value];
        }

        return [name, value];
    }

    private setProps(element: Element, props: DomProps) {
        const control = element as HTMLInputElement & HTMLSelectElement;
        if (props.value !== undefined && 'value' in control && control.value !== props.value) {
            control.value = props.value;
        }
        if (props.checked !== undefined && 'checked' in control) {
            control.checked = props.checked;
        }
        if (props.selectedIndex !== undefined && 'selectedIndex' in control) {
            control.selectedIndex = props.selectedIndex;
        }
        if (props.selected !== undefined && 'options' in control) {
            const selected = new Set(props.selected);
            for (let i = 0; i < control.options.length; i++) {
                control.options[i].selected = selected.has(i);
            }
        }
        if (props.css !== undefined) {
            element.textContent = props.css;
        }
    }
}

/** The keyframe and batches of one document, up to and including seq, starting from the last keyframe before it. */
export function domPacketsUntil<T extends {kind: string, seq: number}>(packets: T[], seq: number): T[] {
    let start = -1;
    for (let i = 0; i < packets.length && packets[i].seq <= seq; i++) {
        if (packets[i].kind === 'keyframe') {
            start = i;
        }
    }
    if (start === -1) {
        return [];
    }

    const until: T[] = [];
    for (let i = start; i < packets.length && packets[i].seq <= seq; i++) {
        until.push(packets[i]);
    }
    return until;
}

export type {DomScroll};

/**
 * The document an iframe element shows at a point of its parent's recording: one the point flushed, or else the last
 * one linked to the element before time that had recorded something by then. A frame that started navigating is
 * linked to its new document before that document sent anything, and until then still shows the old one.
 */
export function domFrameDocument(
    links: {owner: number, doc: string, timestamp: number}[],
    owner: number,
    frames: Record<string, number>|undefined,
    time: number,
    recorded: (doc: string) => boolean = () => true,
): string|undefined {
    let flushed: string|undefined;
    let before: string|undefined;
    for (const link of links) {
        if (link.owner !== owner) {
            continue;
        }
        if (frames !== undefined && link.doc in frames) {
            flushed = link.doc;
        }
        if (link.timestamp <= time && recorded(link.doc)) {
            before = link.doc;
        }
    }
    return flushed ?? before;
}

/** The last batch of a document that arrived until time. */
export function domSeqAt(packets: {seq: number, timestamp: number}[], time: number): number|undefined {
    let seq: number|undefined;
    for (const packet of packets) {
        if (packet.timestamp > time) {
            break;
        }
        seq = packet.seq;
    }
    return seq;
}
