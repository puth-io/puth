import { describe } from 'vitest';
import { testLocal } from '../helper';

describe('delayed special-key typing in Chrome', () => {
    testLocal('types mixed text and releases Shift before subsequent typing', async ({ puth: { page } }) => {
        await page.setContent('<input>');
        await page.get('input')
            .type('{shift}ab', { delay: 10 })
            .should('have.value', 'AB')
            .type('cd')
            .should('have.value', 'ABcd');
    });

    testLocal('replaces selected text with a delay and releases Control', async ({ puth: { page } }) => {
        await page.setContent('<input value="old text">');
        await page.get('input')
            .type('{selectall}{backspace}new', { delay: 10 })
            .should('have.value', 'new')
            .type(' text')
            .should('have.value', 'new text');
    });
});
