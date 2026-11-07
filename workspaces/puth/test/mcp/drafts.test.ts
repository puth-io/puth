import { assert, describe, it } from 'vitest';
import { createDraft } from '../../../mcp/src/drafts';
import { operations, phpString, translateOperation } from '../../../mcp/src/operations';

const step = (index: number, kind: any, details: any) => ({ index, kind, step: details, outcome: 'passed' as const, page: 0 });
const visit = step(0, 'navigate', { operation: 'navigate', url: 'http://app.test/login' });
const assertion = step(1, 'assertion', { operation: 'see', text: 'Welcome', timeout: 3000 });
const draft = (target: any, steps: any[]) => createDraft({
    target,
    name: 'User logs in',
    steps,
    appUrl: 'http://app.test',
    artifacts: ['/artifacts/screenshot-1.png'],
    sessionId: 'session-1',
});

describe('Test drafts', () => {
    it('use relative URLs in Laravel and absolute ones elsewhere', () => {
        assert.include(draft('laravel', [visit, assertion]).code, "$browser->visit('/login')");
        assert.include(draft('php', [visit, assertion]).code, "$browser->visit('http://app.test/login')");
    });

    it('are labeled as unverified', () => {
        const { status, code } = draft('laravel', [visit, assertion]);

        assert.strictEqual(status, 'unverified');
        assert.include(code, 'UNVERIFIED');
    });

    it('reference evidence', () => {
        assert.include(draft('php', [visit, assertion]).code, '// Evidence: /artifacts/screenshot-1.png');
    });

    it('never infer success from completed actions', () => {
        const click = step(1, 'action', { operation: 'click', selector: '#save', timeout: 3000 });
        const { code, unresolved } = draft('laravel', [visit, click]);

        assert.notInclude(code, '->assert');
        assert.isTrue(unresolved.some((item) => item.includes('No assertion was recorded')));
    });

    it('do not contain credentials', () => {
        const typed = step(1, 'action', { operation: 'type', selector: 'input[name="password"]', text: 'hunter2', timeout: 3000 });

        for (const target of ['laravel', 'php']) {
            const { code, unresolved } = draft(target, [visit, typed, assertion]);

            assert.notInclude(code, 'hunter2');
            assert.include(code, 'PUTH_TEST_SECRET');
            assert.isTrue(unresolved.some((item) => item.includes('credential')));
        }
    });

    it('mark data they can not know about', () => {
        assert.isTrue(draft('laravel', [visit, assertion]).unresolved.some((item) => item.includes('Database state')));
    });

    it('mark workflows that leave the application', () => {
        const external = step(1, 'navigate', { operation: 'navigate', url: 'http://other.test/' });

        assert.isTrue(draft('laravel', [visit, external, assertion]).unresolved.some((item) => item.includes('other.test')));
    });

    it('mark steps on other pages', () => {
        const popup = { ...assertion, page: 1 };

        assert.isTrue(draft('php', [visit, popup]).unresolved.some((item) => item.includes('page 1')));
    });

    it('rank selectors and report the weaker ones', () => {
        const click = (selector: string, index: number) => step(index, 'action', { operation: 'click', selector, timeout: 3000 });
        const { selectorWarnings } = draft('php', [
            visit,
            click('[puth="save"]', 1),
            click('#save', 2),
            click('div > button:nth-child(2)', 3),
            assertion,
        ]);

        assert.deepEqual(selectorWarnings, [
            { selector: '#save', strength: 'medium' },
            { selector: 'div > button:nth-child(2)', strength: 'weak' },
        ]);
    });

    it('set custom timeouts in a way all clients treat alike', () => {
        const slow = step(1, 'wait', { operation: 'waitForVisible', selector: '#done', timeout: 8000 });

        assert.include(draft('laravel', [visit, slow, assertion]).code, "->setTimeout(8000)\n                ->waitFor('#done')");
    });

    it('escape strings', () => {
        assert.strictEqual(phpString(`it's a \\ path`), `'it\\'s a \\\\ path'`);
    });
});

describe('Operation registry', () => {
    it('translates every operation', () => {
        const parameters = { selector: '#x', text: 'y', value: 'z', keys: ['a'], url: '/u', path: '/p', title: 't', count: 1, response: 'accept' };

        for (const operation of Object.keys(operations)) {
            for (const target of ['php', 'laravel'] as const) {
                assert.isNotEmpty(translateOperation({ operation, ...parameters } as any, target), operation);
            }
        }
    });

    it('knows that Laravel takes keys as arguments', () => {
        const step = { operation: 'keypress', selector: '#x', keys: ['a', 'b'] } as any;

        assert.deepEqual(translateOperation(step, 'laravel'), ["keys('#x', 'a', 'b')"]);
        assert.deepEqual(translateOperation(step, 'php'), ["keys('#x', ['a', 'b'])"]);
    });
});
