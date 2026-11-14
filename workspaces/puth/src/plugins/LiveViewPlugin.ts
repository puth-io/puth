import {v4} from 'uuid';
import { CDPSession, Page } from 'puppeteer-core';
import Context from "../Context";
import PuthInstancePlugin from "../PuthInstancePlugin";
import { Puth } from '../Puth';
import PuthContextPlugin from "../PuthContextPlugin";
import { Constructors } from '@puth/core';
import {setWindowBounds} from './Std/PuthBrowserExtensions';

export class LiveViewContextPlugin extends PuthContextPlugin {
    constructor() {
        super();
        
        this.register({
            [Constructors.Page]: {
                setViewport: (page, viewport) => this.setViewport(page, viewport),
            },
        });
    }
    
    async setViewport(page: Page, viewport: any) {
        await setWindowBounds(page.browser(), {
            width: viewport.width,
            height: viewport.height + 300,
            windowState: 'normal',
        });
        
        return await page.setViewport(viewport);
    }
}

type ScreencastSession = {
    client: CDPSession;
    handler: (event: any) => Promise<void>;
};

type ContextRecording = {
    pages: Map<Page, number>;
    sessions: Map<Page, ScreencastSession>;
    onPageCreated: (event: any) => void;
    onPageClosed: (event: {page: Page}) => void;
    onFramesChanged: (event: {enabled: boolean}) => void;
};

/**
 * Records the frames Chrome paints, for contexts that turn frames on (the context option `frames`, or
 * Context.enableFrames()). Frames are stored as Chrome sends them; the GUI crops them to the viewport.
 */
export class LiveViewSnapshotPlugin extends PuthInstancePlugin {
    private recordings = new Map<Context, ContextRecording>();
    
    install(puth: Puth) {
        super.install(puth);
        
        puth.on('context:created', ({context}) => {
            this.handleContextCreated(context);
        });
        
        puth.on('context:destroyed', ({context}) => {
            this.handleContextDestroyed(context);
        });
    }
    
    private handleContextCreated(context: Context) {
        if (! context.shouldSnapshot) {
            return;
        }

        const recording: ContextRecording = {
            pages: new Map(),
            sessions: new Map(),
            onPageCreated: ({page}) => {
                recording.pages.set(page, recording.pages.size + 1);
                if (context.isFramesEnabled) {
                    void this.attachScreencastEvents(context, recording, page);
                }
            },
            onPageClosed: ({page}) => {
                recording.pages.delete(page);
                this.detachScreencastEvents(recording, page);
            },
            // Tests can turn frames on and off while they run.
            onFramesChanged: ({enabled}) => {
                for (const page of recording.pages.keys()) {
                    if (enabled) {
                        void this.attachScreencastEvents(context, recording, page);
                    } else {
                        this.detachScreencastEvents(recording, page);
                    }
                }
            },
        };
        
        this.recordings.set(context, recording);
        context.on('page:created', recording.onPageCreated);
        context.on('page:closed', recording.onPageClosed);
        context.on('frames:changed', recording.onFramesChanged);
    }
    
    private handleContextDestroyed(context: Context) {
        const recording = this.recordings.get(context);
        if (recording === undefined) {
            return;
        }
        
        this.recordings.delete(context);
        context.off('page:created', recording.onPageCreated);
        context.off('page:closed', recording.onPageClosed);
        context.off('frames:changed', recording.onFramesChanged);
        [...recording.sessions.keys()].forEach(page => this.detachScreencastEvents(recording, page));
    }
    
    private async attachScreencastEvents(context: Context, recording: ContextRecording, page: Page) {
        const pageIdx = recording.pages.get(page) ?? 0;
        if (recording.sessions.has(page)) {
            return;
        }
        
        let client: CDPSession;
        try {
            client = await page.createCDPSession();
        } catch (error) {
            this.puth?.logger.debug({error}, 'Could not create screencast session');
            return;
        }
        
        // Frames may have been turned off, or the page closed, while the session was created.
        if (this.recordings.get(context) !== recording || page.isClosed() || ! context.isFramesEnabled || recording.sessions.has(page)) {
            client.detach().catch(() => {});
            return;
        }
        
        const handler = async ({data, metadata, sessionId}) => {
            client.send('Page.screencastFrameAck', {
                sessionId,
            }).catch(err => {
                // TODO handle target closed
            });
            
            this.puth.snapshotHandler.pushToCache(context as TODO, {
                id: v4(),
                type: 'screencasts',
                version: 1,
                context: context.serialize(),
                timestamp: metadata.timestamp * 1000,
                page: {
                    index: pageIdx,
                    url: page.url(),
                    viewport: page.viewport(),
                },
                browser: {
                    // index: browserIdx,
                    index: 0,
                },
                // A frame can be larger than the viewport, the GUI shows the viewport from the top.
                frame: Buffer.from(data, 'base64'),
                initiator: 'lvp_psfa',
            });
        };
        client.on('Page.screencastFrame', handler);
        recording.sessions.set(page, {client, handler});
        
        client.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 75,
            everyNthFrame: 1,
        }).catch(err => {
            // TODO handle target closed
            this.puth?.logger.error({
                debugInfo: page.browser().debugInfo,
            }, 'Could not start screencast');
        });
    }
    
    private detachScreencastEvents(recording: ContextRecording, page: Page) {
        const session = recording.sessions.get(page);
        if (session === undefined) {
            return;
        }
        
        recording.sessions.delete(page);
        session.client.off('Page.screencastFrame', session.handler);
        session.client.detach().catch(() => {});
    }
}
