import { z } from 'zod';
import { type Browser } from '@puth/client';

/**
 * The single definition of what agents can do. Tool schemas and test exports both come from here, so an operation can
 * not be offered without a translation, and no arbitrary remote invocation is reachable.
 */

export type ExportTarget = 'php'|'laravel';
export type OperationKind = 'action'|'wait'|'assertion';

type Operation<Schema extends z.ZodRawShape> = {
    kind: OperationKind;
    schema: Schema;
    run: (browser: Browser, parameters: z.infer<z.ZodObject<Schema>>) => Promise<unknown>;
    // Returns the method calls in a chain, without the leading arrow.
    php: (parameters: z.infer<z.ZodObject<Schema>>, target: ExportTarget) => string[];
};

const define = <Schema extends z.ZodRawShape>(operation: Operation<Schema>) => operation;

export const phpString = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const call = (name: string, ...parameters: string[]) => [`${name}(${parameters.join(', ')})`];

const selector = z.string().min(1).max(1000).describe('CSS selector');
const text = z.string().max(10000);

export const operations = {
    click: define({
        kind: 'action',
        schema: { selector },
        run: (browser, { selector }) => browser.click(selector),
        php: ({ selector }) => call('click', phpString(selector)),
    }),
    type: define({
        kind: 'action',
        schema: { selector, text },
        run: (browser, { selector, text }) => browser.type(selector, text),
        php: ({ selector, text }) => call('type', phpString(selector), phpString(text)),
    }),
    select: define({
        kind: 'action',
        schema: { selector, value: text },
        run: (browser, { selector, value }) => browser.select(selector, value),
        php: ({ selector, value }) => call('select', phpString(selector), phpString(value)),
    }),
    check: define({
        kind: 'action',
        schema: { selector },
        run: (browser, { selector }) => browser.check(selector),
        php: ({ selector }) => call('check', phpString(selector)),
    }),
    uncheck: define({
        kind: 'action',
        schema: { selector },
        run: (browser, { selector }) => browser.uncheck(selector),
        php: ({ selector }) => call('uncheck', phpString(selector)),
    }),
    keypress: define({
        kind: 'action',
        schema: { selector, keys: z.array(z.string().min(1).max(100)).min(1).max(50) },
        run: (browser, { selector, keys }) => browser.keys(selector, keys),
        php: ({ selector, keys }, target) => {
            const quoted = keys.map(phpString);

            return target === 'laravel'
                ? call('keys', phpString(selector), ...quoted)
                : call('keys', phpString(selector), `[${quoted.join(', ')}]`);
        },
    }),
    dialog: define({
        kind: 'action',
        schema: {
            response: z.enum(['accept', 'dismiss']),
            text: text.optional().describe('Text for prompts'),
        },
        run: async (browser, { response, text }) => {
            if (text !== undefined) {
                await browser.typeInDialog(text);
            }

            return response === 'accept' ? browser.acceptDialog() : browser.dismissDialog();
        },
        php: ({ response, text }) => [
            ...(text === undefined ? [] : call('typeInDialog', phpString(text))),
            ...call(response === 'accept' ? 'acceptDialog' : 'dismissDialog'),
        ],
    }),

    waitForVisible: define({
        kind: 'wait',
        schema: { selector },
        run: (browser, { selector }) => browser.waitFor(selector),
        php: ({ selector }) => call('waitFor', phpString(selector)),
    }),
    waitForMissing: define({
        kind: 'wait',
        schema: { selector },
        run: (browser, { selector }) => browser.waitUntilMissing(selector),
        php: ({ selector }) => call('waitUntilMissing', phpString(selector)),
    }),
    waitForText: define({
        kind: 'wait',
        schema: { text },
        run: (browser, { text }) => browser.waitForText(text),
        php: ({ text }) => call('waitForText', phpString(text)),
    }),
    waitForTextMissing: define({
        kind: 'wait',
        schema: { text },
        run: (browser, { text }) => browser.waitUntilMissingText(text),
        php: ({ text }) => call('waitUntilMissingText', phpString(text)),
    }),
    waitForUrl: define({
        kind: 'wait',
        schema: { url: text },
        run: (browser, { url }) => browser.waitForLocation(url),
        php: ({ url }) => call('waitForLocation', phpString(url)),
    }),
    waitForEnabled: define({
        kind: 'wait',
        schema: { selector },
        run: (browser, { selector }) => browser.waitUntilEnabled(selector),
        php: ({ selector }) => call('waitUntilEnabled', phpString(selector)),
    }),
    waitForDisabled: define({
        kind: 'wait',
        schema: { selector },
        run: (browser, { selector }) => browser.waitUntilDisabled(selector),
        php: ({ selector }) => call('waitUntilDisabled', phpString(selector)),
    }),

    see: define({
        kind: 'assertion',
        schema: { text },
        run: (browser, { text }) => browser.assertSee(text),
        php: ({ text }) => call('assertSee', phpString(text)),
    }),
    dontSee: define({
        kind: 'assertion',
        schema: { text },
        run: (browser, { text }) => browser.assertDontSee(text),
        php: ({ text }) => call('assertDontSee', phpString(text)),
    }),
    seeIn: define({
        kind: 'assertion',
        schema: { selector, text },
        run: (browser, { selector, text }) => browser.assertSeeIn(selector, text),
        php: ({ selector, text }) => call('assertSeeIn', phpString(selector), phpString(text)),
    }),
    title: define({
        kind: 'assertion',
        schema: { title: text },
        run: (browser, { title }) => browser.assertTitle(title),
        php: ({ title }) => call('assertTitle', phpString(title)),
    }),
    urlIs: define({
        kind: 'assertion',
        schema: { url: text },
        run: (browser, { url }) => browser.assertUrlIs(url),
        php: ({ url }) => call('assertUrlIs', phpString(url)),
    }),
    pathIs: define({
        kind: 'assertion',
        schema: { path: text },
        run: (browser, { path }) => browser.assertPathIs(path),
        php: ({ path }) => call('assertPathIs', phpString(path)),
    }),
    visible: define({
        kind: 'assertion',
        schema: { selector },
        run: (browser, { selector }) => browser.assertVisible(selector),
        php: ({ selector }) => call('assertVisible', phpString(selector)),
    }),
    missing: define({
        kind: 'assertion',
        schema: { selector },
        run: (browser, { selector }) => browser.assertMissing(selector),
        php: ({ selector }) => call('assertMissing', phpString(selector)),
    }),
    value: define({
        kind: 'assertion',
        schema: { selector, value: text },
        run: (browser, { selector, value }) => browser.assertValue(selector, value),
        php: ({ selector, value }) => call('assertValue', phpString(selector), phpString(value)),
    }),
    checked: define({
        kind: 'assertion',
        schema: { selector },
        run: (browser, { selector }) => browser.assertChecked(selector),
        php: ({ selector }) => call('assertChecked', phpString(selector)),
    }),
    notChecked: define({
        kind: 'assertion',
        schema: { selector },
        run: (browser, { selector }) => browser.assertNotChecked(selector),
        php: ({ selector }) => call('assertNotChecked', phpString(selector)),
    }),
    count: define({
        kind: 'assertion',
        schema: { selector, count: z.number().int().min(0) },
        run: (browser, { selector, count }) => browser.assertCount(selector, count),
        php: ({ selector, count }) => call('assertCount', phpString(selector), String(count)),
    }),
};

export type OperationName = keyof typeof operations;

// Explicit waits use 3 seconds unless asked otherwise, and stay below the deadline of the whole operation.
export const DEFAULT_TIMEOUT = 3000;
const timeout = z.number().int().min(0).max(25000).default(DEFAULT_TIMEOUT).describe('Milliseconds to retry for');

export function operationSchema(kind: OperationKind) {
    const options = Object.entries(operations)
        .filter(([, operation]) => operation.kind === kind)
        .map(([name, operation]) => z.object({ operation: z.literal(name), ...operation.schema, timeout }).strict());

    return z.discriminatedUnion('operation', options as any);
}

export function runOperation(browser: Browser, { operation, ...parameters }: { operation: OperationName } & Record<string, any>) {
    return (operations[operation] as Operation<any>).run(browser, parameters);
}

export function translateOperation(
    { operation, ...parameters }: { operation: OperationName } & Record<string, any>,
    target: ExportTarget,
): string[] {
    return (operations[operation] as Operation<any>).php(parameters, target);
}
