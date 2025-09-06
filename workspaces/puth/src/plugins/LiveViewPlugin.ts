import {v4} from 'uuid';
import { Browser, BrowserContext, Page } from 'puppeteer-core';
import Context from "../Context";
import PuthInstancePlugin from "../PuthInstancePlugin";
import { Puth } from '../Puth';
import PuthContextPlugin from "../PuthContextPlugin";
import Constructors from "../context/Constructors";
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

export class LiveViewSnapshotPlugin extends PuthInstancePlugin {
    private pages: Page[] = [];
    private handlers: any[] = [];
    
    install(puth: Puth) {
        super.install(puth);
        
        puth.on('context:created', ({context}) => {
            this.handleContextCreated(context);
        });
        
        puth.on('context:destroyed', ({context}) => {
            this.detachScreencastEvents(context);
        });
    }
    
    private async handleContextCreated(context: Context) {
        await Promise.all([context.browsers.flatMap(
            async rv => rv.ref.contexts.flatMap(
                async browser => {
                    return Promise.all([(await browser.pages()).map(page => {
                        return this.attachScreencastEvents({context, browser, page} as TODO);
                    })]);
                },
            ),
        )]);
        
        const pageCreated = event => this.attachScreencastEvents({context, ...event});
        context.on('page:created', pageCreated);
        this.handlers.push([context, 'page:created', pageCreated]);
        
        const pageClosed = ({page}) => {
            this.pages.splice(this.pages.indexOf(page), 1);
            this.handlers = this.handlers.filter(x => x[0] !== page);
        };
        context.on('page:closed', pageClosed);
        this.handlers.push([context, 'page:closed', pageClosed]);
    }
    
    private async attachScreencastEvents({context, page, browser}: {
        context: Context,
        page: Page,
        browser: Browser|undefined,
        browserContext: BrowserContext,
    }) {
        let pageIdx = this.pages.push(page);
        // let browserIdx = context.browsers.indexOf(browser as TODO);

        const client = await page.createCDPSession();
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
        this.handlers.push([client, 'Page.screencastFrame', handler]);
        
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
    
    private detachScreencastEvents(context: Context) {
        this.handlers.forEach(([holder, event, handler]) => holder.off(event, handler));
        this.handlers = [];
    }
}
