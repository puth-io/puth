import {v4} from 'uuid';
import {Page} from 'puppeteer-core';
import Context from "puth/src/Context";
import PuthInstancePlugin from "puth/src/PuthInstancePlugin";
import Puth from "puth";
import {PuthBrowser} from "puth/src/HandlesBrowsers";
import Snapshots from "puth/src/Snapshots";
import PuthContextPlugin from "puth/src/PuthContextPlugin";
import Constructors from "puth/src/Context/Constructors";
import sharp from "sharp";

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
        let cdp = await page.browser().target().createCDPSession();
        
        const {targetInfos: [{targetId}]} = await cdp.send('Target.getTargets');
        const {windowId} = await cdp.send(
            'Browser.getWindowForTarget',
            {targetId},
        );
        await cdp.send('Browser.setWindowBounds', {
            bounds: {
                width: viewport.width,
                height: viewport.height + 300,
            },
            windowId,
        });
        
        await page.setViewport(viewport);
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
        await Promise.all([context.browsers.map(async browser => {
            return Promise.all([(await browser.pages()).map(page => {
                return this.attachScreencastEvents({context, browser, page});
            })]);
        })]);
        
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
        browser: PuthBrowser
    }) {
        let pageIdx = this.pages.push(page);
        let browserIdx = context.browsers.indexOf(browser);
        
        const client = await page.target().createCDPSession();
        const handler = async ({data, metadata, sessionId}) => {
            const serializedContext = context.serialize();
            const url = page.url();
            const viewport = page.viewport();
            
            let frame = Buffer.from(data, 'base64');
            
            client.send('Page.screencastFrameAck', {
                sessionId,
            }).catch(err => console.log(err));
            
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
            
            Snapshots.pushToCache(context, {
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
                    index: browserIdx,
                },
                frame,
            });
        };
        client.on('Page.screencastFrame', handler);
        this.handlers.push([client, 'Page.screencastFrame', handler]);
        
        client.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 75,
        });
    }
    
    private detachScreencastEvents(context: Context) {
        this.handlers.forEach(([holder, event, handler]) => holder.off(event, handler));
        this.handlers = [];
    }
}
