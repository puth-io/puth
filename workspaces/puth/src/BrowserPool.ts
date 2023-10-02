import {Browser} from "puppeteer";

class BrowserPool {
    
    async clear(browser: Browser) {
        let cdp = await browser.target().createCDPSession();
        
        await Promise.all([
            cdp.send('Network.clearAcceptedEncodingsOverride'),
            cdp.send('Network.clearBrowserCache'),
            cdp.send('Network.clearBrowserCookies'),
            cdp.send('Log.clear'),
            cdp.send('IndexedDB.clearObjectStore', {}),
        ]);
    }
    
}

const BrowserPoolInstance = new BrowserPool();
export default BrowserPoolInstance;