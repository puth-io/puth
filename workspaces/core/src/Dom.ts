/**
 * The DOM recording format. A recorder in each page sends one keyframe per document, then batches of changes,
 * which the GUI applies to rebuild the document at any point.
 *
 * Applying batch n to the state after batch n - 1 gives the document as it was when batch n was flushed. Batches
 * carry current values, not the history of a change, so they never depend on how the page got there.
 */

/** A serialized node. Every node has an id that stays the same for as long as the node exists. */
export type DomNode =
    | [id: number, type: DomNodeType.ELEMENT, tag: string, attributes: string[], children: DomNode[], props: DomProps | 0, namespace: DomNamespace]
    | [id: number, type: DomNodeType.TEXT, data: string]
    | [id: number, type: DomNodeType.COMMENT, data: string]
    | [id: number, type: DomNodeType.DOCTYPE, name: string, publicId: string, systemId: string];

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
};

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
}

export type DomChange =
    | [op: DomOp.CHILDREN, parent: number, children: (number | DomNode)[]]
    | [op: DomOp.ATTRIBUTES, element: number, attributes: string[]]
    | [op: DomOp.TEXT, node: number, data: string]
    | [op: DomOp.CONTROL, element: number, value: string | null, checked: boolean | null, selectedIndex: number | null, selected?: number[] | null]
    | [op: DomOp.CSS, element: number, css: string]
    | [op: DomOp.SCROLL, ...DomScroll]
    | [op: DomOp.VIEWPORT, ...DomViewport];

export type DomKeyframe = {
    url: string;
    /** The base URL relative URLs resolve against, which a <base> element can change. */
    base: string;
    /** Id of the document node, the parent of the root children. */
    document: number;
    root: DomNode[];
    viewport: DomViewport;
    scroll: DomScroll[];
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
