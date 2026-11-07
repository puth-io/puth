import {type ICommand, type ICommandError, type IPacket} from '@puth/core';
import { BaseHandler } from './BaseHandler';
import { Encoder } from './WebsocketHandler';
import type Context from '../Context';
import type {Page} from 'puppeteer-core';
import {createHash} from 'node:crypto';
import {v4} from 'uuid';

const MIB = 1024 * 1024;

export const DEFAULT_RECORDING_BUDGETS = {
    context: 256 * MIB,
    instance: 1024 * MIB,
};

// Without these a truncated recording could not be opened or would look like an unfinished test.
const ALWAYS_RECORDED_PACKETS = ['context', 'test'];

const MAX_BUDGET_RESERVE = 64 * 1024;

export type RecordingBudgets = typeof DEFAULT_RECORDING_BUDGETS;

type Recording = {
    packets: IPacket[];
    responseContentByHash: Map<string, string>;
    bytes: number;
    truncated: boolean;
};

// Part of each budget stays free so the packets above and the truncation warning fit.
const usableBudget = (budget: number) => budget - Math.min(MAX_BUDGET_RESERVE, budget / 8);

export class SnapshotHandler extends BaseHandler {
    #recordings = new Map<Context, Recording>();
    #bytes = 0;

    pushToCache(context: Context, item, {broadcast} = {broadcast: true}) {
        if (item == null || item.cached) {
            return;
        }

        const recording = this.recordingOf(context);
        const alwaysRecorded = ALWAYS_RECORDED_PACKETS.includes(item.type);

        if (recording.truncated && ! alwaysRecorded) {
            return;
        }

        this.deduplicateResponseContent(recording, item);
        item.cached = true;

        // Sizes are measured on the bytes that get sent, so a packet is only encoded once.
        const encoded = Encoder.encodeSharedRef(item);
        const exceeded = alwaysRecorded ? undefined : this.exceededBudget(context, recording, encoded.byteLength);
        if (exceeded !== undefined) {
            this.truncate(context, recording, exceeded);
            return;
        }

        this.store(recording, item, encoded, broadcast);
    }

    private recordingOf(context: Context): Recording {
        let recording = this.#recordings.get(context);
        if (recording !== undefined) {
            return recording;
        }

        // cleanup cache to have at least some memory limit
        if (this.#recordings.size >= 100) {
            const oldestContext = this.#recordings.keys().next().value;
            if (oldestContext !== undefined) {
                this.remove(oldestContext);
            }
        }

        recording = {packets: [], responseContentByHash: new Map(), bytes: 0, truncated: false};
        this.#recordings.set(context, recording);

        return recording;
    }

    private store(recording: Recording, item: any, encoded: Uint8Array, broadcast: boolean) {
        recording.packets.push(item);
        recording.bytes += encoded.byteLength;
        this.#bytes += encoded.byteLength;

        // TODO maybe implement a time buffer to send out multiple snapshots
        if (broadcast) {
            this.puth.websocketHandler.broadcast(item, encoded);
        }
    }

    private remove(context: Context) {
        this.#bytes -= this.#recordings.get(context)?.bytes ?? 0;
        this.#recordings.delete(context);
    }

    private exceededBudget(context: Context, recording: Recording, size: number): 'context'|'instance'|undefined {
        const budgets = this.budgets;

        if (recording.bytes + size > usableBudget(budgets.context)) {
            return 'context';
        }

        // Finished recordings give way, or a long-running server would end up truncating every new context.
        while (this.#bytes + size > usableBudget(budgets.instance)) {
            const finished = [...this.#recordings.keys()].find(other => other !== context && other.destroying);
            if (finished === undefined) {
                return 'instance';
            }
            this.remove(finished);
        }
    }

    // The retained packets stay untouched, so everything they reference remains available.
    private truncate(context: Context, recording: Recording, budget: 'context'|'instance') {
        recording.truncated = true;

        const limit = this.budgets[budget];
        const text = `Recording stopped after ${recording.bytes} bytes because the ${budget} budget of ${limit} bytes `
            + 'was reached. Later packets are missing from this recording.';
        this.logger?.warn({context: context.id, budget, limit}, text);

        const warning = {
            id: v4(),
            type: 'log',
            context: context.serialize(),
            timestamp: Date.now(),
            messageType: 'warning',
            args: [text],
            location: {},
            text,
            stackTrace: [],
            truncation: {budget, limit, bytes: recording.bytes},
            cached: true,
        };
        this.store(recording, warning, Encoder.encodeSharedRef(warning), true);
    }

    get budgets(): RecordingBudgets {
        return {...DEFAULT_RECORDING_BUDGETS, ...this.puth.recordingBudgets};
    }

    stats() {
        return {
            bytes: this.#bytes,
            budgets: this.budgets,
            recordings: this.#recordings.size,
        };
    }

    statsOf(context: Context) {
        const recording = this.#recordings.get(context);

        return {
            bytes: recording?.bytes ?? 0,
            packets: recording?.packets.length ?? 0,
            truncated: recording?.truncated ?? false,
        };
    }
    
    error(param: Context, page: Page, command: ICommand|undefined, error: ICommandError) {
        if (! command) {
            return;
        }
        
        command.errors.push(error);
    }
    
    getAllCachedItems() {
        return [...this.#recordings.values()].flatMap(recording => recording.packets);
    }
    
    getAllCachedItemsFrom(context: Context): IPacket[] {
        return [...this.#recordings.get(context)?.packets ?? []];
    }
    
    hasCachedItems() {
        return this.#recordings.size !== 0;
    }

    private deduplicateResponseContent(recording: Recording, item: any): void {
        if (item.type !== 'response' || ! (item.content instanceof Uint8Array)) {
            return;
        }

        const content = item.content;
        const contentHash = createHash('sha256').update(content).digest('hex');
        const contentReference = recording.responseContentByHash.get(contentHash);

        item.contentHash = contentHash;
        item.contentLength = content.byteLength;

        if (contentReference !== undefined) {
            item.contentReference = contentReference;
            delete item.content;
            return;
        }

        recording.responseContentByHash.set(contentHash, item.id);
    }
}
