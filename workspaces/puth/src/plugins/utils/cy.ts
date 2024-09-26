/**
 * Parts of this file are from the open source project cypress hence the copy of its licence is included.
 *
 * MIT License
 *
 * Copyright (c) 2023 Cypress.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {capitalizeFirstLetter} from '../../Utils';

export const KeyMapping = {
    leftarrow: 'ArrowLeft',
    rightarrow: 'ArrowRight',
    uparrow: 'ArrowUp',
    downarrow: 'ArrowDown',
    del: 'Delete',
    option: 'Alt',
    command: 'Meta',
    cmd: 'Meta',
    ctrl: 'Control',
    selectall: async (element, options) => {
        let page = element.frame.page();
        
        await page.keyboard.down('Control');
        await page.keyboard.press('A', options);
        if (options?.delay) {
            await page.waitForTimeout(options?.delay);
        }
        await page.keyboard.up('Control');
    },
    // TODO moveToStart
    // TODO moveToEnd
};

/**
 * https://github.com/puppeteer/puppeteer/blob/main/src/common/USKeyboardLayout.ts
 *
 *
 * @param element
 * @param chars
 * @param options
 */
export async function type(element, chars, options: {delay?, parseSpecialCharSequences?} = {}) {
    let parseSpecialCharSequences = options?.parseSpecialCharSequences ?? true;
    if (!parseSpecialCharSequences) {
        await element.type(chars, options);
        return;
    }
    
    let split = chars.split(/({.+?})/).filter((i: string) => i !== '');
    let release: string[] = [];
    
    for (let chs of split) {
        let specialKey = /{(.+?)}/.exec(chs);
        
        if (specialKey) {
            let key = KeyMapping[specialKey[1].toLowerCase()] ?? capitalizeFirstLetter(specialKey[1]);
            
            if (typeof key === 'function') {
                await key(element, options);
            } else {
                await element.frame.page().keyboard.down(key);
                release.push(key);
            }
        } else {
            await element.type(chs, options);
        }
    }
    
    await Promise.all(
        release.map(async (key) => {
            if (options?.delay) {
                await element.frame.page().waitForTimeout(options?.delay);
            }
            await element.frame.page().keyboard.up(key);
        }),
    );
}

export const KeyMap = {
    '0': '0',
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    'Power': 'Power',
    'Eject': 'Eject',
    'Abort': 'Abort',
    'Help': 'Help',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'Numpad5': 'Numpad5',
    'NumpadEnter': 'NumpadEnter',
    'Enter': 'Enter',
    '\r': '\r',
    '\n': '\n',
    'ShiftLeft': 'ShiftLeft',
    'ShiftRight': 'ShiftRight',
    'ControlLeft': 'ControlLeft',
    'ControlRight': 'ControlRight',
    'AltLeft': 'AltLeft',
    'AltRight': 'AltRight',
    'Pause': 'Pause',
    'CapsLock': 'CapsLock',
    'Escape': 'Escape',
    'Convert': 'Convert',
    'NonConvert': 'NonConvert',
    'Space': 'Space',
    'Numpad9': 'Numpad9',
    'PageUp': 'PageUp',
    'Numpad3': 'Numpad3',
    'PageDown': 'PageDown',
    'End': 'End',
    'Numpad1': 'Numpad1',
    'Home': 'Home',
    'Numpad7': 'Numpad7',
    'ArrowLeft': 'ArrowLeft',
    'Numpad4': 'Numpad4',
    'Numpad8': 'Numpad8',
    'ArrowUp': 'ArrowUp',
    'ArrowRight': 'ArrowRight',
    'Numpad6': 'Numpad6',
    'Numpad2': 'Numpad2',
    'ArrowDown': 'ArrowDown',
    'Select': 'Select',
    'Open': 'Open',
    'PrintScreen': 'PrintScreen',
    'Insert': 'Insert',
    'Numpad0': 'Numpad0',
    'Delete': 'Delete',
    'NumpadDecimal': 'NumpadDecimal',
    'Digit0': 'Digit0',
    'Digit1': 'Digit1',
    'Digit2': 'Digit2',
    'Digit3': 'Digit3',
    'Digit4': 'Digit4',
    'Digit5': 'Digit5',
    'Digit6': 'Digit6',
    'Digit7': 'Digit7',
    'Digit8': 'Digit8',
    'Digit9': 'Digit9',
    'KeyA': 'KeyA',
    'KeyB': 'KeyB',
    'KeyC': 'KeyC',
    'KeyD': 'KeyD',
    'KeyE': 'KeyE',
    'KeyF': 'KeyF',
    'KeyG': 'KeyG',
    'KeyH': 'KeyH',
    'KeyI': 'KeyI',
    'KeyJ': 'KeyJ',
    'KeyK': 'KeyK',
    'KeyL': 'KeyL',
    'KeyM': 'KeyM',
    'KeyN': 'KeyN',
    'KeyO': 'KeyO',
    'KeyP': 'KeyP',
    'KeyQ': 'KeyQ',
    'KeyR': 'KeyR',
    'KeyS': 'KeyS',
    'KeyT': 'KeyT',
    'KeyU': 'KeyU',
    'KeyV': 'KeyV',
    'KeyW': 'KeyW',
    'KeyX': 'KeyX',
    'KeyY': 'KeyY',
    'KeyZ': 'KeyZ',
    'MetaLeft': 'MetaLeft',
    'MetaRight': 'MetaRight',
    'ContextMenu': 'ContextMenu',
    'NumpadMultiply': 'NumpadMultiply',
    'NumpadAdd': 'NumpadAdd',
    'NumpadSubtract': 'NumpadSubtract',
    'NumpadDivide': 'NumpadDivide',
    'F1': 'F1',
    'F2': 'F2',
    'F3': 'F3',
    'F4': 'F4',
    'F5': 'F5',
    'F6': 'F6',
    'F7': 'F7',
    'F8': 'F8',
    'F9': 'F9',
    'F10': 'F10',
    'F11': 'F11',
    'F12': 'F12',
    'F13': 'F13',
    'F14': 'F14',
    'F15': 'F15',
    'F16': 'F16',
    'F17': 'F17',
    'F18': 'F18',
    'F19': 'F19',
    'F20': 'F20',
    'F21': 'F21',
    'F22': 'F22',
    'F23': 'F23',
    'F24': 'F24',
    'NumLock': 'NumLock',
    'ScrollLock': 'ScrollLock',
    'AudioVolumeMute': 'AudioVolumeMute',
    'AudioVolumeDown': 'AudioVolumeDown',
    'AudioVolumeUp': 'AudioVolumeUp',
    'MediaTrackNext': 'MediaTrackNext',
    'MediaTrackPrevious': 'MediaTrackPrevious',
    'MediaStop': 'MediaStop',
    'MediaPlayPause': 'MediaPlayPause',
    'Semicolon': 'Semicolon',
    'Equal': 'Equal',
    'NumpadEqual': 'NumpadEqual',
    'Comma': 'Comma',
    'Minus': 'Minus',
    'Period': 'Period',
    'Slash': 'Slash',
    'Backquote': 'Backquote',
    'BracketLeft': 'BracketLeft',
    'Backslash': 'Backslash',
    'BracketRight': 'BracketRight',
    'Quote': 'Quote',
    'AltGraph': 'AltGraph',
    'Props': 'Props',
    'Cancel': 'Cancel',
    'Clear': 'Clear',
    'Shift': 'Shift',
    'Control': 'Control',
    'Alt': 'Alt',
    'Accept': 'Accept',
    'ModeChange': 'ModeChange',
    ' ': ' ',
    'Print': 'Print',
    'Execute': 'Execute',
    '\u0000': '\u0000',
    'a': 'a',
    'b': 'b',
    'c': 'c',
    'd': 'd',
    'e': 'e',
    'f': 'f',
    'g': 'g',
    'h': 'h',
    'i': 'i',
    'j': 'j',
    'k': 'k',
    'l': 'l',
    'm': 'm',
    'n': 'n',
    'o': 'o',
    'p': 'p',
    'q': 'q',
    'r': 'r',
    's': 's',
    't': 't',
    'u': 'u',
    'v': 'v',
    'w': 'w',
    'x': 'x',
    'y': 'y',
    'z': 'z',
    'Meta': 'Meta',
    '*': '*',
    '+': '+',
    '-': '-',
    '/': '/',
    ';': ';',
    '=': '=',
    ',': ',',
    '.': '.',
    '`': '`',
    '[': '[',
    '\\': '\\',
    ']': ']',
    '\'': '\'',
    'Attn': 'Attn',
    'CrSel': 'CrSel',
    'ExSel': 'ExSel',
    'EraseEof': 'EraseEof',
    'Play': 'Play',
    'ZoomOut': 'ZoomOut',
    ')': ')',
    '!': '!',
    '@': '@',
    '#': '#',
    '$': '$',
    '%': '%',
    '^': '^',
    '&': '&',
    '(': '(',
    'A': 'A',
    'B': 'B',
    'C': 'C',
    'D': 'D',
    'E': 'E',
    'F': 'F',
    'G': 'G',
    'H': 'H',
    'I': 'I',
    'J': 'J',
    'K': 'K',
    'L': 'L',
    'M': 'M',
    'N': 'N',
    'O': 'O',
    'P': 'P',
    'Q': 'Q',
    'R': 'R',
    'S': 'S',
    'T': 'T',
    'U': 'U',
    'V': 'V',
    'W': 'W',
    'X': 'X',
    'Y': 'Y',
    'Z': 'Z',
    ':': ':',
    '<': '<',
    '_': '_',
    '>': '>',
    '?': '?',
    '~': '~',
    '{': '{',
    '|': '|',
    '}': '}',
    '"': '"',
    'SoftLeft': 'SoftLeft',
    'SoftRight': 'SoftRight',
    'Camera': 'Camera',
    'Call': 'Call',
    'EndCall': 'EndCall',
    'VolumeDown': 'VolumeDown',
    'VolumeUp': 'VolumeUp',
}

export type KeyInput =
    | '0'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | 'Power'
    | 'Eject'
    | 'Abort'
    | 'Help'
    | 'Backspace'
    | 'Tab'
    | 'Numpad5'
    | 'NumpadEnter'
    | 'Enter'
    | '\r'
    | '\n'
    | 'ShiftLeft'
    | 'ShiftRight'
    | 'ControlLeft'
    | 'ControlRight'
    | 'AltLeft'
    | 'AltRight'
    | 'Pause'
    | 'CapsLock'
    | 'Escape'
    | 'Convert'
    | 'NonConvert'
    | 'Space'
    | 'Numpad9'
    | 'PageUp'
    | 'Numpad3'
    | 'PageDown'
    | 'End'
    | 'Numpad1'
    | 'Home'
    | 'Numpad7'
    | 'ArrowLeft'
    | 'Numpad4'
    | 'Numpad8'
    | 'ArrowUp'
    | 'ArrowRight'
    | 'Numpad6'
    | 'Numpad2'
    | 'ArrowDown'
    | 'Select'
    | 'Open'
    | 'PrintScreen'
    | 'Insert'
    | 'Numpad0'
    | 'Delete'
    | 'NumpadDecimal'
    | 'Digit0'
    | 'Digit1'
    | 'Digit2'
    | 'Digit3'
    | 'Digit4'
    | 'Digit5'
    | 'Digit6'
    | 'Digit7'
    | 'Digit8'
    | 'Digit9'
    | 'KeyA'
    | 'KeyB'
    | 'KeyC'
    | 'KeyD'
    | 'KeyE'
    | 'KeyF'
    | 'KeyG'
    | 'KeyH'
    | 'KeyI'
    | 'KeyJ'
    | 'KeyK'
    | 'KeyL'
    | 'KeyM'
    | 'KeyN'
    | 'KeyO'
    | 'KeyP'
    | 'KeyQ'
    | 'KeyR'
    | 'KeyS'
    | 'KeyT'
    | 'KeyU'
    | 'KeyV'
    | 'KeyW'
    | 'KeyX'
    | 'KeyY'
    | 'KeyZ'
    | 'MetaLeft'
    | 'MetaRight'
    | 'ContextMenu'
    | 'NumpadMultiply'
    | 'NumpadAdd'
    | 'NumpadSubtract'
    | 'NumpadDivide'
    | 'F1'
    | 'F2'
    | 'F3'
    | 'F4'
    | 'F5'
    | 'F6'
    | 'F7'
    | 'F8'
    | 'F9'
    | 'F10'
    | 'F11'
    | 'F12'
    | 'F13'
    | 'F14'
    | 'F15'
    | 'F16'
    | 'F17'
    | 'F18'
    | 'F19'
    | 'F20'
    | 'F21'
    | 'F22'
    | 'F23'
    | 'F24'
    | 'NumLock'
    | 'ScrollLock'
    | 'AudioVolumeMute'
    | 'AudioVolumeDown'
    | 'AudioVolumeUp'
    | 'MediaTrackNext'
    | 'MediaTrackPrevious'
    | 'MediaStop'
    | 'MediaPlayPause'
    | 'Semicolon'
    | 'Equal'
    | 'NumpadEqual'
    | 'Comma'
    | 'Minus'
    | 'Period'
    | 'Slash'
    | 'Backquote'
    | 'BracketLeft'
    | 'Backslash'
    | 'BracketRight'
    | 'Quote'
    | 'AltGraph'
    | 'Props'
    | 'Cancel'
    | 'Clear'
    | 'Shift'
    | 'Control'
    | 'Alt'
    | 'Accept'
    | 'ModeChange'
    | ' '
    | 'Print'
    | 'Execute'
    | '\u0000'
    | 'a'
    | 'b'
    | 'c'
    | 'd'
    | 'e'
    | 'f'
    | 'g'
    | 'h'
    | 'i'
    | 'j'
    | 'k'
    | 'l'
    | 'm'
    | 'n'
    | 'o'
    | 'p'
    | 'q'
    | 'r'
    | 's'
    | 't'
    | 'u'
    | 'v'
    | 'w'
    | 'x'
    | 'y'
    | 'z'
    | 'Meta'
    | '*'
    | '+'
    | '-'
    | '/'
    | ';'
    | '='
    | ','
    | '.'
    | '`'
    | '['
    | '\\'
    | ']'
    | "'"
    | 'Attn'
    | 'CrSel'
    | 'ExSel'
    | 'EraseEof'
    | 'Play'
    | 'ZoomOut'
    | ')'
    | '!'
    | '@'
    | '#'
    | '$'
    | '%'
    | '^'
    | '&'
    | '('
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E'
    | 'F'
    | 'G'
    | 'H'
    | 'I'
    | 'J'
    | 'K'
    | 'L'
    | 'M'
    | 'N'
    | 'O'
    | 'P'
    | 'Q'
    | 'R'
    | 'S'
    | 'T'
    | 'U'
    | 'V'
    | 'W'
    | 'X'
    | 'Y'
    | 'Z'
    | ':'
    | '<'
    | '_'
    | '>'
    | '?'
    | '~'
    | '{'
    | '|'
    | '}'
    | '"'
    | 'SoftLeft'
    | 'SoftRight'
    | 'Camera'
    | 'Call'
    | 'EndCall'
    | 'VolumeDown'
    | 'VolumeUp'
