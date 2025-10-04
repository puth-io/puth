import {Page, CDPSession, Protocol} from 'puppeteer-core';
import { Return } from '../../context/Return';

export async function maximize(page: Page) {
    await setWindowBounds(page, { windowState: 'maximized' });
}

export async function move(page: Page, x: number, y: number) {
    await setWindowBounds(page, { left: x, top: y });
}

export async function bounds(page: Page) {
    return Return.Value(await getWindowBounds(page));
}

export async function setWindowBounds(
    page: Page,
    bounds: Protocol.Browser.Bounds,
    cdp?: CDPSession,
    autoClose = false,
) {
    if (cdp == null) {
        cdp = await page.createCDPSession();
        autoClose = true;
    }

    return await cdp
        .send('Browser.getWindowForTarget')
        .then(({ windowId }) => cdp.send('Browser.setWindowBounds', { windowId, bounds }))
        .finally(async () => {
            if (autoClose) await cdp?.detach();
        });
}

export async function getWindowBounds(page: Page, cdp?: CDPSession, autoClose = false) {
    if (cdp == null) {
        cdp = await page.createCDPSession();
        autoClose = true;
    }

    return cdp
        .send('Browser.getWindowForTarget')
        .then(({ windowId }) => cdp.send('Browser.getWindowBounds', { windowId }))
        .then(({ bounds }) => bounds)
        .finally(async () => {
            if (autoClose) await cdp?.detach();
        });
}
