import { DEFAULT_TIMEOUT, type ExportTarget, phpString, translateOperation } from './operations';
import { type JournalStep } from './sessions';

const SECRET_FIELD = /pass|secret|token|api[-_]?key/i;

function selectorStrength(selector: string): 'stable'|'medium'|'weak' {
    if (/\[(puth|data-testid)[=\]]/.test(selector)) {
        return 'stable';
    }
    if (/^#[\w-]+$/.test(selector) || /\[(name|aria-label)=/.test(selector)) {
        return 'medium';
    }

    return 'weak';
}

const className = (name: string) => {
    const words = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    const joined = words.map(word => word[0].toUpperCase() + word.slice(1)).join('') || 'Recorded';

    return `${/^\d/.test(joined) ? 'Test' : ''}${joined}${joined.endsWith('Test') ? '' : 'Test'}`;
};

const methodName = (name: string) =>
    'test_' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'recorded_workflow');

export type DraftOptions = {
    target: ExportTarget;
    name: string;
    steps: JournalStep[];
    appUrl?: string;
    artifacts: string[];
    sessionId: string;
    // Only the steps, for pasting after a handoff in the test that offered it.
    fragment?: boolean;
};

export function createDraft({ target, name, steps, appUrl, artifacts, sessionId, fragment = false }: DraftOptions) {
    const unresolved: string[] = [];
    const selectorWarnings: { selector: string, strength: string }[] = [];
    const lines: string[] = [];

    const relative = (url: string) => {
        if (target === 'laravel' && appUrl !== undefined && url.startsWith(appUrl)) {
            return url.slice(appUrl.length) || '/';
        }
        if (appUrl !== undefined && ! url.startsWith(appUrl)) {
            unresolved.push(`The workflow leaves the application at ${url}. Check that the test environment can reach it.`);
        }

        return url;
    };

    for (const { step, kind, page } of steps) {
        if (page !== 0) {
            unresolved.push(`Step "${step.op}" ran on page ${page}. Switching pages is not exported, add it by hand.`);
        }

        if (step.op === 'visit') {
            lines.push(`visit(${phpString(relative(step.url))})`);
            continue;
        }

        if (step.selector !== undefined) {
            const strength = selectorStrength(step.selector);
            if (strength !== 'stable' && ! selectorWarnings.some(warning => warning.selector === step.selector)) {
                selectorWarnings.push({ selector: step.selector, strength });
            }
        }

        if (step.timeout !== undefined && step.timeout !== DEFAULT_TIMEOUT) {
            // Not a timeout parameter, because clients scale those differently.
            lines.push(`setTimeout(${step.timeout})`);
        }

        if (step.op === 'type' && SECRET_FIELD.test(step.selector)) {
            const variable = 'PUTH_TEST_SECRET';
            unresolved.push(`The value typed into ${step.selector} looks like a credential. Provide it through ${variable}.`);
            lines.push(`type(${phpString(step.selector)}, ${target === 'laravel' ? `env('${variable}')` : `getenv('${variable}')`})`);
            continue;
        }

        lines.push(...translateOperation(step, target));
    }

    if (fragment) {
        unresolved.push('Checks of what the application did, like sent mail or database rows, go after handoff() in the test.');
    }

    if (! steps.some(({ kind }) => kind === 'assertion')) {
        unresolved.push('No assertion was recorded, so this test would pass without verifying the workflow. Add at least one.');
    }
    unresolved.push('Database state, users and other data the session relied on were not captured. Set them up in the test.');

    const indent = ' '.repeat(fragment ? 4 : (target === 'laravel' ? 16 : 12));
    let started = false;
    const chain = lines.map((line) => {
        if (line.startsWith('//')) {
            return indent + line;
        }

        const prefix = started ? `${indent}->` : '$browser->';
        started = true;

        return prefix + line;
    }).join('\n');
    const notes = [
        '// UNVERIFIED: exported by puth-mcp and not run yet. Only a passing run of the real test suite verifies it.',
        `// Session: ${sessionId}`,
        ...artifacts.map(file => `// Evidence: ${file}`),
        ...[...new Set(unresolved)].map(item => `// TODO: ${item}`),
        ...selectorWarnings.map(({ selector, strength }) => `// TODO: ${selector} is a ${strength} selector. Add puth="name" to the element and use [puth="name"].`),
    ];
    const indented = (indent: string) => notes.map(note => indent + note).join('\n');

    const code = fragment
        ? `${notes.join('\n')}\n${chain};\n`
        : target === 'laravel'
        ? `<?php

namespace Tests\\Browser;

use Puth\\Laravel\\Browser;
use Tests\\PuthTestCase;

class ${className(name)} extends PuthTestCase
{
    function ${methodName(name)}()
    {
${indented('        ')}
        // The browser is closed by browse() after the test.
        $this->browse(function (Browser $browser) {
            ${chain};
        });
    }
}
`
        : `<?php

namespace Tests\\Feature;

use Puth\\PuthTestCase;

class ${className(name)} extends PuthTestCase
{
    function ${methodName(name)}()
    {
${indented('        ')}
        // The context and its browsers are destroyed by tearDown().
        $browser = $this->context->createBrowserShim();

        ${chain};
    }
}
`;

    return {
        format: target,
        status: 'unverified' as const,
        className: className(name),
        code,
        unresolved: [...new Set(unresolved)],
        selectorWarnings,
        evidence: artifacts,
    };
}
