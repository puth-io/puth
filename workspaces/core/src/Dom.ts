/**
 * The DOM recording format. A recorder in each page sends one keyframe per document, then batches of changes,
 * which the GUI applies to rebuild the document at any point.
 *
 * Applying batch n to the state after batch n - 1 gives the document as it was when batch n was flushed. Batches
 * carry current values, not the history of a change, so they never depend on how the page got there.
 *
 * For size, nodes are flat token lists and strings come from a table per document. A keyframe starts the table,
 * every packet appends the strings it added (DomPacket.strings), in order.
 */

/** The index of a string in the document's table, or the string itself. */
export type DomString = number | string;

/**
 * Nodes as flat tokens, in pre-order. Every node has an id that stays the same for as long as the node exists.
 *
 *     element:            id, 1, tag, namespace, attribute count, (name, value)..., props, child count, children...
 *     text and comment:   id, 3 or 8, data
 *     doctype:            id, 10, name, public id, system id
 *
 * An element's open shadow root is in its props: the root's id, then its children as a node list.
 *
 * A node list starts with the number of nodes in it. In the children of a CHILDREN change, a node the replay has
 * already is its negative id.
 */
export type DomTokens = (number | string | DomProps | 0)[];

export enum DomNodeType {
    ELEMENT = 1,
    TEXT = 3,
    COMMENT = 8,
    DOCTYPE = 10,
}

export enum DomNamespace {
    HTML = 0,
    SVG = 1,
    MATHML = 2,
}

/** State of form controls and stylesheets that their attributes and children don't show. */
export type DomProps = {
    value?: string;
    checked?: boolean;
    selectedIndex?: number;
    /** The selected options of a select that allows several. */
    selected?: number[];
    /** Rules a script added to a <style> element through the CSSOM, like CSS-in-JS libraries do. */
    css?: string;
    /** The element's open shadow root: its id, then its children as a node list. */
    shadow?: DomTokens;
    /** Whether the element is in the top layer, if it is. */
    top?: DomTopLayer;
};

export enum DomTopLayer {
    NONE = 0,
    /** A dialog opened with showModal(). */
    MODAL = 1,
    /** A popover that is open. */
    POPOVER = 2,
}

export type DomViewport = [width: number, height: number, devicePixelRatio: number];

/** Scroll position of an element, or of the window for id 0. */
export type DomScroll = [id: number, x: number, y: number];

export enum DomOp {
    /** The complete current children of a node: ids of nodes it had before, serialized nodes for new ones. */
    CHILDREN = 1,
    /** The complete current attributes of an element. */
    ATTRIBUTES = 2,
    TEXT = 3,
    CONTROL = 4,
    CSS = 6,
    SCROLL = 7,
    VIEWPORT = 8,
    /** A shadow root attached to an element recorded before: the root's id, then its children as a node list. */
    SHADOW = 9,
    /** The rules of an adopted stylesheet, the first time it is adopted and whenever they change. */
    SHEET = 10,
    /** The complete current adopted stylesheets of the document or of a shadow root, by sheet id. */
    ADOPT = 11,
    TOP_LAYER = 12,
}

export type DomChange =
    | [op: DomOp.CHILDREN, parent: number, children: DomTokens]
    | [op: DomOp.ATTRIBUTES, element: number, attributes: DomString[]]
    | [op: DomOp.TEXT, node: number, data: DomString]
    | [op: DomOp.CONTROL, element: number, value: string | null, checked: boolean | null, selectedIndex: number | null, selected?: number[] | null]
    | [op: DomOp.CSS, element: number, css: string]
    | [op: DomOp.SCROLL, ...DomScroll]
    | [op: DomOp.VIEWPORT, ...DomViewport]
    | [op: DomOp.SHADOW, host: number, root: DomTokens]
    | [op: DomOp.SHEET, sheet: number, css: string]
    | [op: DomOp.ADOPT, root: number, sheets: number[]]
    | [op: DomOp.TOP_LAYER, element: number, state: DomTopLayer];

export type DomKeyframe = {
    url: string;
    /** The base URL relative URLs resolve against, which a <base> element can change. */
    base: string;
    /** Id of the document node, the parent of the root children. */
    document: number;
    /** The document's children, as a node list. */
    root: DomTokens;
    viewport: DomViewport;
    scroll: DomScroll[];
    /** The adopted stylesheets, as sheet id and rules. */
    sheets?: [sheet: number, css: string][];
    /** The document and shadow roots that adopted stylesheets, with their sheet ids. */
    adopted?: [root: number, sheets: number[]][];
};

/**
 * A point in a page's DOM recording: the state after batch seq of the top document doc, and of the documents in
 * its frames after the batches in frames.
 */
export type DomPoint = {
    page: number;
    doc: string;
    seq: number;
    frames?: Record<string, number>;
};

/** One message of a recorder, recorded as it arrived. */
export type IDomPacket = {
    id: string;
    type: 'dom';
    timestamp: number;
    page: number;
    doc: string;
    seq: number;
    /** The strings this packet added to the document's table. */
    strings?: string[];
} & ({kind: 'keyframe', data: DomKeyframe} | {kind: 'changes', data: DomChange[]});

/**
 * Which document an iframe element shows: the element with id owner in document parentDoc shows document doc,
 * from the time this arrived until another document is linked to the same element.
 */
export type IDomFrame = {
    id: string;
    type: 'dom-frame';
    timestamp: number;
    page: number;
    parentDoc: string;
    owner: number;
    doc: string;
};

/** A response body the replay serves to the rebuilt document, like a stylesheet, font or image. */
export type IDomResource = {
    id: string;
    type: 'dom-resource';
    timestamp: number;
    url: string;
    status: number;
    contentType: string;
    content?: Uint8Array;
    /** SHA-256 hash of the body. */
    contentHash?: string;
    /** Packet id containing the body when this resource duplicates an earlier one. */
    contentReference?: string;
    contentLength?: number;
};
