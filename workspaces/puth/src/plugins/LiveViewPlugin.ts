import {v4} from 'uuid';
import { CDPSession, Page } from 'puppeteer-core';
import Context from "../Context";
import PuthInstancePlugin from "../PuthInstancePlugin";
import { Puth } from '../Puth';
import PuthContextPlugin from "../PuthContextPlugin";
import { Constructors } from '@puth/core';
import sharp from "sharp";
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
    pageCounter: number;
    sessions: Map<Page, ScreencastSession>;
    onPageCreated: (event: any) => void;
    onPageClosed: (event: {page: Page}) => void;
};

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
        const recording: ContextRecording = {
            pageCounter: 0,
            sessions: new Map(),
            onPageCreated: ({page}) => void this.attachScreencastEvents(context, recording, page),
            onPageClosed: ({page}) => this.detachScreencastEvents(recording, page),
        };
        
        this.recordings.set(context, recording);
        context.on('page:created', recording.onPageCreated);
        context.on('page:closed', recording.onPageClosed);
    }
    
    private handleContextDestroyed(context: Context) {
        const recording = this.recordings.get(context);
        if (recording === undefined) {
            return;
        }
        
        this.recordings.delete(context);
        context.off('page:created', recording.onPageCreated);
        context.off('page:closed', recording.onPageClosed);
        [...recording.sessions.keys()].forEach(page => this.detachScreencastEvents(recording, page));
    }
    
    private async attachScreencastEvents(context: Context, recording: ContextRecording, page: Page) {
        const pageIdx = ++recording.pageCounter;
        
        let client: CDPSession;
        try {
            client = await page.createCDPSession();
        } catch (error) {
            this.puth?.logger.debug({error}, 'Could not create screencast session');
            return;
        }
        
        if (this.recordings.get(context) !== recording || page.isClosed()) {
            client.detach().catch(() => {});
            return;
        }
        
        const handler = async ({data, metadata, sessionId}) => {
            const serializedContext = context.serialize();
            const url = page.url();
            const viewport = page.viewport();
            
            let frame = Buffer.from(data, 'base64');
            
            client.send('Page.screencastFrameAck', {
                sessionId,
            }).catch(err => {
                // TODO handle target closed
            });
            
            try {
                if (viewport) {
                    frame = await sharp(frame)
                        .jpeg()
                        .resize({
                            height: viewport.height,
                            width: viewport.width,
                            fit: 'cover',
                            position: 'top',
                        })
                        .toBuffer();
                }
            } catch (error) {
                this.puth?.logger.warn({error}, 'Could not process screencast frame');
                return;
            }
            
            this.puth.snapshotHandler.pushToCache(context as TODO, {
                id: v4(),
                type: 'screencasts',
                version: 1,
                context: serializedContext,
                timestamp: metadata.timestamp * 1000,
                page: {
                    index: pageIdx,
                    url,
                    viewport,
                },
                browser: {
                    // index: browserIdx,
                    index: 0,
                },
                frame,
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
