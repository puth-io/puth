// @ts-ignore
import { ConnectionClosedError, type Frame, type Page, TargetCloseError } from 'puppeteer-core';

export class PageClosedError extends Error {}

// A rejected command can arrive shortly before puppeteer marks the page as closed.
const PAGE_CLOSE_SETTLE_DELAY = 50;

const NAVIGATION_ERRORS = [
    'Attempted to use detached Frame',
    'Execution context was destroyed',
];

// These only say that the page changed under a running command, so an idempotent command can run again.
const TARGET_CHANGE_ERRORS = [
    ...NAVIGATION_ERRORS,
    'Argument should belong to the same JavaScript world',
    'Cannot find context with specified id',
    'Execution context is not available in detached frame',
    'Inspected target navigated or closed',
    'JSHandle is disposed',
    'Navigating frame was detached',
    'Node is detached from document',
    'Waiting failed: Frame detached',
    'waitForFunction failed: frame got detached',
];

// Puppeteer wraps errors, for example waitForSelector keeps the actual failure in cause.
function someInChain(error: any, test: (error: any) => boolean): boolean {
    for (let current = error; current != null; current = current.cause) {
        if (test(current)) {
            return true;
        }
    }

    return false;
}

const includesAny = (error: any, messages: string[]) =>
    someInChain(error, current => messages.some(message => current.message?.includes(message)));

export function isConnectionLost(error: any): boolean {
    return someInChain(error, current => current instanceof TargetCloseError || current instanceof ConnectionClosedError);
}

export function isNavigationError(error: any): boolean {
    return includesAny(error, NAVIGATION_ERRORS);
}

export function isTargetChange(error: any): boolean {
    return isConnectionLost(error) || includesAny(error, TARGET_CHANGE_ERRORS);
}

// Lets a target change pass through handlers that turn every other error into a failed expectation.
export function rethrowTargetChange(error: any) {
    if (isTargetChange(error)) {
        throw error;
    }
}

function isGone(site: Page | Frame): boolean {
    const page = typeof (site as Page).isClosed === 'function' ? site as Page : (site as Frame).page?.();

    return page != null && (page.isClosed() || ! page.browser().connected);
}

export async function isPageClosed(site: Page | Frame | undefined, error: any): Promise<boolean> {
    if (site == null) {
        return isConnectionLost(error);
    }
    if (isConnectionLost(error)) {
        await new Promise(resolve => setTimeout(resolve, PAGE_CLOSE_SETTLE_DELAY));
    }

    return isGone(site);
}
