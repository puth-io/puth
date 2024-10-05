import {Browser, CDPSession} from 'puppeteer-core';
import {Protocol} from 'devtools-protocol/types/protocol';
import Return from '../../context/Return';

export async function maximize(browser: Browser) {
    await setWindowBounds(browser, {windowState: 'maximized'});
}

export async function move(browser: Browser, x: number, y: number) {
    await setWindowBounds(browser, {left: x, top: y});
}

export async function bounds(browser: Browser) {
    return Return.Value(await getWindowBounds(browser));
}

export async function setWindowBounds(browser: Browser, bounds: Protocol.Browser.Bounds, cdp?: CDPSession, autoClose = true) {
    if (cdp == null) {
        cdp = await browser.target().createCDPSession();
    }
    
    return await getWindowForTarget(browser, cdp)
        .then(({windowId}) => cdp.send('Browser.setWindowBounds', {windowId, bounds}))
        .then(async () => autoClose ? await cdp.detach() : cdp);
}

function getWindowBounds(browser: Browser) {
    return browser.target().createCDPSession()
        .then(cdp => getWindowForTarget(browser, cdp)
            .then(({windowId}) => cdp.send('Browser.getWindowBounds', {windowId}))
            .then(({bounds}) => bounds),
        );
}

function getWindowForTarget(browser: Browser, cdp: CDPSession) {
    return cdp.send('Target.getTargets')
        .then(({targetInfos: [{targetId}]}) => cdp.send('Browser.getWindowForTarget', {targetId}));
}
