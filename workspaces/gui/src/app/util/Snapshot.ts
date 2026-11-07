import {decode} from '@msgpack/msgpack';
import {SNAPSHOT_VERSION} from '@puth/core';
import {PUTH_EXTENSION_CODEC} from '../store/ConnectionStore.ts';

export class SnapshotImportError extends Error {}

function decodeSnapshot(data: ArrayBuffer): unknown {
    try {
        return decode(data, {extensionCodec: PUTH_EXTENSION_CODEC});
    } catch {
        throw new SnapshotImportError('This file is not a Puth snapshot or it is damaged.');
    }
}

export function parseSnapshot(data: ArrayBuffer): any[] {
    const packets = decodeSnapshot(data);
    
    if (! Array.isArray(packets) || packets.length === 0) {
        throw new SnapshotImportError('This snapshot does not contain any packets.');
    }
    
    const [first] = packets;
    if (first?.type !== 'context' || first?.context?.id == null) {
        throw new SnapshotImportError('This snapshot does not start with a context packet.');
    }
    
    const version = first.snapshotVersion ?? 1;
    if (! Number.isInteger(version) || version < 1 || version > SNAPSHOT_VERSION) {
        throw new SnapshotImportError(
            `Snapshot version ${version} is not supported. This GUI reads versions up to ${SNAPSHOT_VERSION}.`,
        );
    }
    
    const withContent = new Set(packets.filter(packet => packet?.content != null).map(packet => packet.id));
    const missing = packets.find(packet => packet?.contentReference != null && ! withContent.has(packet.contentReference));
    if (missing !== undefined) {
        throw new SnapshotImportError(`Response ${missing.id} references content that is missing from this snapshot.`);
    }
    
    return packets;
}
