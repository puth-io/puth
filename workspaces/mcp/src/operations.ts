import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { type Browser, type Context } from '@puth/client';
import { ToolError } from './errors';

/**
 * The single definition of what agents can do. The schema of puth_run and test exports both come from here, so an
 * operation can not be offered without a translation.
 */

export type ExportTarget = 'php'|'laravel';
export type OperationKind = 'navigate'|'action'|'wait'|'assertion';
export type Step = { op: string, timeout?: number } & Record<string, any>;

type Runtime = { browser: Browser, context: Context };

type Operation = {
    kind: OperationKind;
    needs: string[];
    run: (runtime: Runtime, step: Step) => Promise<unknown>;
    // Returns the method calls in a chain, without the leading arrow. A line starting with // stays a comment.
    php: (step: Step, target: ExportTarget) => string[];
};

export const phpString = (value: unknown) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const call = (name: string, ...parameters: unknown[]) => [`${name}(${parameters.map(phpString).join(', ')})`];

// Most operations map to one Browser method with the same arguments.
const simple = (kind: OperationKind, method: string, ...needs: string[]): Operation => ({
    kind,
    needs,
    run: ({ browser }, step) => (browser as any)[method](...needs.map(need => step[need])),
    php: (step) => call(method, ...needs.map(need => step[need])),
});

export const operations: Record<string, Operation> = {
    visit: simple('navigate', 'visit', 'url'),
    back: simple('navigate', 'back'),
    forward: simple('navigate', 'forward'),
    reload: simple('navigate', 'refresh'),

    click: simple('action', 'click', 'selector'),
    press: simple('action', 'press', 'text'),
    clickLink: simple('action', 'clickLink', 'text'),
    type: simple('action', 'type', 'selector', 'text'),
    select: simple('action', 'select', 'selector', 'value'),
    check: simple('action', 'check', 'selector'),
    uncheck: simple('action', 'uncheck', 'selector'),
    hover: simple('action', 'mouseover', 'selector'),
    drag: simple('action', 'drag', 'selector', 'to'),
    scroll: simple('action', 'scrollIntoView', 'selector'),
    keys: {
        kind: 'action',
        needs: ['selector', 'keys'],
        run: ({ browser }, { selector, keys }) => browser.keys(selector, keys),
        php: ({ selector, keys }, target) => {
            const quoted = keys.map(phpString);

            return [target === 'laravel'
                ? `keys(${[phpString(selector), ...quoted].join(', ')})`
                : `keys(${phpString(selector)}, [${quoted.join(', ')}])`];
        },
    },
    upload: {
        kind: 'action',
        needs: ['selector', 'file'],
        run: async ({ browser, context }, { selector, file }) => {
            const content = await readFile(file).catch(() => {
                throw new ToolError('INVALID_REQUEST', `Can not read file [${file}].`);
            });
            const temporary = await context.saveTemporaryFile(path.basename(file), content.toString('base64'));
            const input = await browser.firstOrFail(selector);

            return input.uploadFile(temporary);
        },
        php: ({ selector, file }, target) => target === 'laravel'
            ? call('attach', selector, file)
            : [`// TODO: upload ${file} to ${selector}, the PHP client has no helper for this.`],
    },
    dialog: {
        kind: 'action',
        needs: ['response'],
        run: async ({ browser }, { response, text }) => {
            if (text !== undefined) {
                await browser.typeInDialog(text);
            }

            return response === 'accept' ? browser.acceptDialog() : browser.dismissDialog();
        },
        php: ({ response, text }) => [
            ...(text === undefined ? [] : call('typeInDialog', text)),
            ...call(response === 'accept' ? 'acceptDialog' : 'dismissDialog'),
        ],
    },
    // The value goes through JSON, because everything else would come back as a handle.
    evaluate: {
        kind: 'action',
        needs: ['script'],
        run: ({ browser }, { script }) => browser.evaluate(`(async () => JSON.stringify(await (${script})))()`),
        php: ({ script }) => call('evaluate', script),
    },

    waitFor: simple('wait', 'waitFor', 'selector'),
    waitGone: simple('wait', 'waitUntilMissing', 'selector'),
    waitText: simple('wait', 'waitForText', 'text'),
    waitTextGone: simple('wait', 'waitUntilMissingText', 'text'),
    waitUrl: simple('wait', 'waitForLocation', 'url'),
    waitEnabled: simple('wait', 'waitUntilEnabled', 'selector'),
    waitDisabled: simple('wait', 'waitUntilDisabled', 'selector'),

    see: simple('assertion', 'assertSee', 'text'),
    dontSee: simple('assertion', 'assertDontSee', 'text'),
    seeIn: simple('assertion', 'assertSeeIn', 'selector', 'text'),
    title: simple('assertion', 'assertTitle', 'text'),
    urlIs: simple('assertion', 'assertUrlIs', 'url'),
    pathIs: simple('assertion', 'assertPathIs', 'url'),
    visible: simple('assertion', 'assertVisible', 'selector'),
    missing: simple('assertion', 'assertMissing', 'selector'),
    value: simple('assertion', 'assertValue', 'selector', 'value'),
    checked: simple('assertion', 'assertChecked', 'selector'),
    notChecked: simple('assertion', 'assertNotChecked', 'selector'),
    count: {
        kind: 'assertion',
        needs: ['selector', 'count'],
        run: ({ browser }, { selector, count }) => browser.assertCount(selector, count),
        php: ({ selector, count }) => [`assertCount(${phpString(selector)}, ${count})`],
    },
};

// Explicit waits use 3 seconds unless asked otherwise, and stay below the deadline of the whole operation.
export const DEFAULT_TIMEOUT = 3000;

// Flat on purpose: this schema is sent to the agent in every session, a union of all operations costs far more.
export const stepSchema = z.object({
    op: z.enum(Object.keys(operations) as [string, ...string[]]),
    selector: z.string().min(1).max(1000).optional(),
    text: z.string().max(10000).optional(),
    value: z.string().max(10000).optional(),
    url: z.string().max(4000).optional(),
    to: z.string().max(1000).optional(),
    file: z.string().max(4000).optional(),
    keys: z.array(z.string().min(1).max(100)).max(50).optional(),
    script: z.string().max(20000).optional(),
    count: z.number().int().min(0).optional(),
    response: z.enum(['accept', 'dismiss']).optional(),
    timeout: z.number().int().min(0).max(25000).optional(),
});

export const operationSummary = Object.entries(operations)
    .map(([name, { needs }]) => `${name}(${needs.join(',')})`)
    .join(' ');

export function validateStep(step: Step) {
    const missing = operations[step.op].needs.filter(need => step[need] === undefined);
    if (missing.length > 0) {
        throw new ToolError('INVALID_REQUEST', `${step.op} needs ${missing.join(', ')}.`);
    }
}

export const operationKind = (step: Step) => operations[step.op].kind;

export const runOperation = (runtime: Runtime, step: Step) => operations[step.op].run(runtime, step);

export const translateOperation = (step: Step, target: ExportTarget) => operations[step.op].php(step, target);
