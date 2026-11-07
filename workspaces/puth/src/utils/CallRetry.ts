import { type Browser, ExpectationFailed } from '../shims/Browser';
import { PageClosedError, isPageClosed, isTargetChange } from './TargetErrors';

const RETRY_DELAY = 50;

/**
 * - assertion: runs again until it passes or its timeout ran out.
 * - read: only observes the page, so it can run again when the page changes under it.
 * - action: finds its target like a read, but never runs again once it acted on the page.
 */
export type CallKind = 'assertion'|'read'|'action';

const READS = [
    'attribute',
    'bounds',
    'clickablePoint',
    'content',
    'find',
    'findAll',
    'findOrFail',
    'firstOrFail',
    'getCookieByName',
    'inputValue',
    'resolveForButtonPress',
    'resolveForChecking',
    'resolveForField',
    'resolveForRadioSelection',
    'resolveForSelection',
    'resolveForTyping',
    'resolveSelectOptions',
    'screenshot',
    'text',
    'title',
    'vueAttribute',
];

const ACTIONS = [
    'append',
    'appendSlowly',
    'check',
    'clear',
    'click',
    'clickAndHold',
    'clickAtXPath',
    'clickLink',
    'controlClick',
    'doubleClick',
    'drag',
    'dragDown',
    'dragLeft',
    'dragOffset',
    'dragRight',
    'dragUp',
    'keys',
    'mouseover',
    'press',
    'pressAndWaitFor',
    'radio',
    'rightClick',
    'select',
    'type',
    'typeSlowly',
    'uncheck',
];

export function browserCallKind(name: string, parameters: any[]): CallKind|undefined {
    if (/^(assert|wait)/.test(name)) {
        return 'assertion';
    }
    // With a second parameter this sets the value instead of reading it.
    if (READS.includes(name) || (name === 'value' && parameters[1] == null)) {
        return 'read';
    }
    if (ACTIONS.includes(name)) {
        return 'action';
    }
}

/**
 * State of a running call, which all of its attempts share.
 */
export class CallAttempt {
    readonly startedAt = Date.now();
    deadline?: number;
    retried = false;
    dispatched = false;

    // The first attempt keeps the exact timeout of the call, because messages report it.
    timeout(resolved: number): number {
        this.deadline ??= this.startedAt + resolved;

        return this.retried ? Math.max(1, this.deadline - Date.now()) : resolved;
    }
}

export async function runBrowserCall<T>(
    browser: Browser,
    attempt: CallAttempt,
    name: string,
    kind: CallKind,
    fn: () => Promise<T>|T,
): Promise<T> {
    browser.attempt = attempt;

    // What fails after the deadline only ran out of time, which says nothing about why the call could not pass.
    let lastFailure: ExpectationFailed|undefined;

    try {
        while (true) {
            try {
                return await fn();
            } catch (error: any) {
                const targetChanged = ! (error instanceof ExpectationFailed) && isTargetChange(error);
                const expectationFailed = kind === 'assertion' && error instanceof ExpectationFailed;

                if (attempt.dispatched || (! targetChanged && ! expectationFailed)) {
                    throw error;
                }
                if (targetChanged && await isPageClosed(browser.site, error)) {
                    throw new PageClosedError(`Page closed during ${name}.`);
                }

                attempt.deadline ??= attempt.startedAt + browser.timeout;
                if (Date.now() >= attempt.deadline) {
                    throw lastFailure ?? (expectationFailed ? error : new ExpectationFailed(
                        `${name} did not finish in ${attempt.deadline - attempt.startedAt}ms `
                        + `because the page kept changing: ${error.message}`,
                    ));
                }

                if (expectationFailed) {
                    lastFailure = error;
                }
                attempt.retried = true;
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    } finally {
        browser.attempt = undefined;
    }
}
