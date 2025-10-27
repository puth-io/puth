/**
 * The type function is base on the type function from the open source project cypress hence a copy of its licence is included.
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

import {sleep} from "../../Utils";

/**
 * Keyboard Layout
 * https://github.com/puppeteer/puppeteer/blob/main/src/common/USKeyboardLayout.ts
 *
 * When using modifier keys you can only send valid US layout characters
 * https://github.com/puppeteer/puppeteer/issues/9770
 *
 * @param element
 * @param chars
 * @param options
 */
export async function type(element, chars, options: {delay?, parseSpecialCharSequences?} = {}) {
    if (Array.isArray(chars)) {
        for (let item of chars) {
            await type(element, item, options);
        }
        
        return;
    }
    
    let parseSpecialCharSequences = options?.parseSpecialCharSequences ?? true;
    if (!parseSpecialCharSequences) {
        await element.type(chars, options);
        if (options?.delay) {
            await sleep(options.delay);
        }
        
        return;
    }
    if (!/{(.+?)}/.test(chars)) { // no special characters in chars
        await element.type(chars, options);
        if (options?.delay) {
            await sleep(options.delay);
        }
        
        return;
    }
    
    let split = chars.split(/({.+?})/).filter((i: string) => i !== '');
    let release: string[] = [];
    
    for (let chs of split) {
        let specialKey = /{(.+?)}/.exec(chs);
        
        if (specialKey) {
            let key = SpecialKeysMap[specialKey[1].toLowerCase()] ?? specialKey[1];
            if (typeof key === 'function') {
                await key(element, options);
            } else {
                console.debug('special', key);
                await element.frame.page().keyboard.down(key);
                release.push(key);
            }
            if (options?.delay) {
                await sleep(options.delay);
            }
        } else {
            for (let ch of chs.split('')) {
                await element.frame.page().keyboard.down(ch);
                if (options?.delay) {
                    await sleep(options.delay);
                }
                await element.frame.page().keyboard.up(ch);
                if (options?.delay) {
                    await sleep(options.delay);
                }
            }
        }
    }
    
    for (let key of release) {
        await element.frame.page().keyboard.up(key);
        if (options?.delay) {
            await sleep(options.delay);
        }
    }
}

export const SpecialKeysMap = {
    // custom special keys
    'leftarrow': 'ArrowLeft',
    'rightarrow': 'ArrowRight',
    'uparrow': 'ArrowUp',
    'downarrow': 'ArrowDown',
    'del': 'Delete',
    'option': 'Alt',
    'command': 'Meta',
    'cmd': 'Meta',
    'ctrl': 'Control',
    // TODO moveToStart
    // TODO moveToEnd
    
    // custom special keys as functions
    'selectall': async (element, options) => {
        let page = element.frame.page();
        
        await page.keyboard.down('Control');
        await page.keyboard.press('a', options);
        if (options?.delay) {
            await page.waitForTimeout(options?.delay);
        }
        await page.keyboard.up('Control');
    },
    
    // predefined special keys from https://pptr.dev/api/puppeteer.keyinput
    'power': 'Power',
    'eject': 'Eject',
    'abort': 'Abort',
    'help': 'Help',
    'backspace': 'Backspace',
    'tab': 'Tab',
    'numpad5': 'Numpad5',
    'numpadenter': 'NumpadEnter',
    'enter': 'Enter',
    'shiftleft': 'ShiftLeft',
    'shiftright': 'ShiftRight',
    'controlleft': 'ControlLeft',
    'controlright': 'ControlRight',
    'altleft': 'AltLeft',
    'altright': 'AltRight',
    'pause': 'Pause',
    'capslock': 'CapsLock',
    'escape': 'Escape',
    'convert': 'Convert',
    'nonconvert': 'NonConvert',
    'space': 'Space',
    'numpad9': 'Numpad9',
    'pageup': 'PageUp',
    'numpad3': 'Numpad3',
    'pagedown': 'PageDown',
    'end': 'End',
    'numpad1': 'Numpad1',
    'home': 'Home',
    'numpad7': 'Numpad7',
    'arrowleft': 'ArrowLeft',
    'numpad4': 'Numpad4',
    'numpad8': 'Numpad8',
    'arrowup': 'ArrowUp',
    'arrowright': 'ArrowRight',
    'numpad6': 'Numpad6',
    'numpad2': 'Numpad2',
    'arrowdown': 'ArrowDown',
    'select': 'Select',
    'open': 'Open',
    'printscreen': 'PrintScreen',
    'insert': 'Insert',
    'numpad0': 'Numpad0',
    'delete': 'Delete',
    'numpaddecimal': 'NumpadDecimal',
    'digit0': 'Digit0',
    'digit1': 'Digit1',
    'digit2': 'Digit2',
    'digit3': 'Digit3',
    'digit4': 'Digit4',
    'digit5': 'Digit5',
    'digit6': 'Digit6',
    'digit7': 'Digit7',
    'digit8': 'Digit8',
    'digit9': 'Digit9',
    'metaleft': 'MetaLeft',
    'metaright': 'MetaRight',
    'contextmenu': 'ContextMenu',
    'numpadmultiply': 'NumpadMultiply',
    'numpadadd': 'NumpadAdd',
    'numpadsubtract': 'NumpadSubtract',
    'numpaddivide': 'NumpadDivide',
    'f1': 'F1',
    'f2': 'F2',
    'f3': 'F3',
    'f4': 'F4',
    'f5': 'F5',
    'f6': 'F6',
    'f7': 'F7',
    'f8': 'F8',
    'f9': 'F9',
    'f10': 'F10',
    'f11': 'F11',
    'f12': 'F12',
    'f13': 'F13',
    'f14': 'F14',
    'f15': 'F15',
    'f16': 'F16',
    'f17': 'F17',
    'f18': 'F18',
    'f19': 'F19',
    'f20': 'F20',
    'f21': 'F21',
    'f22': 'F22',
    'f23': 'F23',
    'f24': 'F24',
    'numlock': 'NumLock',
    'scrolllock': 'ScrollLock',
    'audiovolumemute': 'AudioVolumeMute',
    'audiovolumedown': 'AudioVolumeDown',
    'audiovolumeup': 'AudioVolumeUp',
    'mediatracknext': 'MediaTrackNext',
    'mediatrackprevious': 'MediaTrackPrevious',
    'mediastop': 'MediaStop',
    'mediaplaypause': 'MediaPlayPause',
    'semicolon': 'Semicolon',
    'equal': 'Equal',
    'numpadequal': 'NumpadEqual',
    'comma': 'Comma',
    'minus': 'Minus',
    'period': 'Period',
    'slash': 'Slash',
    'backquote': 'Backquote',
    'bracketleft': 'BracketLeft',
    'backslash': 'Backslash',
    'bracketright': 'BracketRight',
    'quote': 'Quote',
    'altgraph': 'AltGraph',
    'props': 'Props',
    'cancel': 'Cancel',
    'clear': 'Clear',
    'shift': 'Shift',
    'control': 'Control',
    'alt': 'Alt',
    'accept': 'Accept',
    'modechange': 'ModeChange',
    'print': 'Print',
    'execute': 'Execute',
    '\u0000': '\u0000',
    'meta': 'Meta',
    'attn': 'Attn',
    'crsel': 'CrSel',
    'exsel': 'ExSel',
    'eraseeof': 'EraseEof',
    'play': 'Play',
    'zoomout': 'ZoomOut',
    'softleft': 'SoftLeft',
    'softright': 'SoftRight',
    'camera': 'Camera',
    'call': 'Call',
    'endcall': 'EndCall',
    'volumedown': 'VolumeDown',
    'volumeup': 'VolumeUp',
}
