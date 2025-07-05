<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**

*/
class Browser extends RemoteObject
{
    /**
     * @debug-gen-original-name "clone"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["Browser"]
     */
    public function clone(): Browser
    {
        return $this->callFunc('clone');
    }

    /**
     * @debug-gen-original-name "setResolverPrefix"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter prefix {"type":"string","isOptional":false}
     */
    public function setResolverPrefix(string $prefix): Browser
    {
        return $this->callFunc('setResolverPrefix', [$prefix]);
    }

    /**
     * @debug-gen-original-name "setResolverPageElements"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter pageElements {"type":"{}","isOptional":false}
     */
    public function setResolverPageElements(mixed $pageElements): Browser
    {
        return $this->callFunc('setResolverPageElements', [$pageElements]);
    }

    /**
     * @debug-gen-original-name "withinIframe"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["Browser"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function _withinIframe(string $selector): Browser
    {
        return $this->callFunc('withinIframe', [$selector]);
    }

    /**
     * @debug-gen-original-name "visit"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter url {"type":"string","isOptional":false}
     */
    public function visit(string $url): Browser
    {
        return $this->callFunc('visit', [$url]);
    }

    /**
     * @debug-gen-original-name "click"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _click(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('click', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "setContent"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter html {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"WaitForOptions","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function setContent(string $html, mixed $options = []): Browser
    {
        return $this->callFunc('setContent', [$html, $options]);
    }

    /**
     * @debug-gen-original-name "blank"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function blank(): Browser
    {
        return $this->callFunc('blank');
    }

    /**
     * @debug-gen-original-name "refresh"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function refresh(mixed $options = []): Browser
    {
        return $this->callFunc('refresh', [$options]);
    }

    /**
     * Navigate to the previous page.
     * 
     * @debug-gen-original-name "back"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function back(mixed $options = []): Browser
    {
        return $this->callFunc('back', [$options]);
    }

    /**
     * Navigate to the next page.
     * 
     * @debug-gen-original-name "forward"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function forward(mixed $options = []): Browser
    {
        return $this->callFunc('forward', [$options]);
    }

    /**
     * @debug-gen-original-name "maximize"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function maximize(): Browser
    {
        return $this->callFunc('maximize');
    }

    /**
     * @debug-gen-original-name "bounds"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["object"]
     */
    public function bounds(): mixed
    {
        return $this->callFunc('bounds');
    }

    /**
     * @debug-gen-original-name "setBounds"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter bounds {"type":"any","isOptional":false}
     */
    public function setBounds(mixed $bounds): Browser
    {
        return $this->callFunc('setBounds', [$bounds]);
    }

    /**
     * @debug-gen-original-name "resize"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter width {"type":"any","isOptional":false}
     * @debug-gen-original-parameter height {"type":"any","isOptional":false}
     */
    public function resize(mixed $width, mixed $height): Browser
    {
        return $this->callFunc('resize', [$width, $height]);
    }

    /**
     * @debug-gen-original-name "move"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter x {"type":"number","isOptional":false}
     * @debug-gen-original-parameter y {"type":"number","isOptional":false}
     */
    public function move(float $x, float $y): Browser
    {
        return $this->callFunc('move', [$x, $y]);
    }

    /**
     * @debug-gen-original-name "scrollIntoView"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function scrollIntoView(string $selector): Browser
    {
        return $this->callFunc('scrollIntoView', [$selector]);
    }

    /**
     * Scroll screen to element at the given selector.
     * 
     * @debug-gen-original-name "scrollTo"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function scrollTo(string $selector): Browser
    {
        return $this->callFunc('scrollTo', [$selector]);
    }

    /**
     * @debug-gen-original-name "evaluate"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["any[]","any"]
     * @debug-gen-original-parameter pageFunction {"type":"string[]|string","isOptional":false}
     * @debug-gen-original-parameter args {"type":"any[]","isOptional":false,"initializer":{"type":"array","members":[]}}
     */
    public function evaluate(mixed $pageFunction, array $args = []): mixed
    {
        return $this->callFunc('evaluate', [$pageFunction, $args]);
    }

    /**
     * @debug-gen-original-name "quit"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     */
    public function quit(): void
    {
        $this->callFunc('quit');
    }

    /**
     * @debug-gen-original-name "url"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function url(): string
    {
        return $this->callFunc('url');
    }

    /**
     * @debug-gen-original-name "scheme"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function scheme(): string
    {
        return $this->callFunc('scheme');
    }

    /**
     * @debug-gen-original-name "host"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function host(): string
    {
        return $this->callFunc('host');
    }

    /**
     * @debug-gen-original-name "path"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function path(): string
    {
        return $this->callFunc('path');
    }

    /**
     * @debug-gen-original-name "port"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function port(): string
    {
        return $this->callFunc('port');
    }

    /**
     * @debug-gen-original-name "title"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["string"]
     */
    public function title(): string
    {
        return $this->callFunc('title');
    }

    /**
     * @debug-gen-original-name "content"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     */
    public function content(): string
    {
        return $this->callFunc('content');
    }

    /**
     * @debug-gen-original-name "viewport"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["Viewport","null"]
     */
    public function viewport(): mixed
    {
        return $this->callFunc('viewport');
    }

    /**
     * @debug-gen-original-name "getCookieByName"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["any"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     */
    public function getCookieByName(string $name): mixed
    {
        return $this->callFunc('getCookieByName', [$name]);
    }

    /**
     * @debug-gen-original-name "setCookie"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter cookies {"type":"any[]","isOptional":false}
     */
    public function setCookie(array $cookies): Browser
    {
        return $this->callFunc('setCookie', [$cookies]);
    }

    /**
     * @debug-gen-original-name "deleteCookie"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter cookies {"type":"any[] | string","isOptional":false}
     */
    public function deleteCookie(mixed $cookies): Browser
    {
        return $this->callFunc('deleteCookie', [$cookies]);
    }

    /**
     * @debug-gen-original-name "screenshot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["Uint8Array"]
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _screenshot(mixed $options = []): mixed
    {
        return $this->callFunc('screenshot', [$options]);
    }

    /**
     * Make the browser window as large as the content
     * 
     * @debug-gen-original-name "fitContent"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     */
    public function fitContent(): Browser
    {
        return $this->callFunc('fitContent');
    }

    /**
     * @debug-gen-original-name "disableFitOnFailure"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function disableFitOnFailure(): Browser
    {
        return $this->callFunc('disableFitOnFailure');
    }

    /**
     * @debug-gen-original-name "enableFitOnFailure"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function enableFitOnFailure(): Browser
    {
        return $this->callFunc('enableFitOnFailure');
    }

    /**
     * @debug-gen-original-name "value"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this","string"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false,"initializer":{"type":"null"}}
     */
    public function value(string $selector, mixed $value = null): mixed
    {
        return $this->callFunc('value', [$selector, $value]);
    }

    /**
     * @debug-gen-original-name "text"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function text(string $selector): string
    {
        return $this->callFunc('text', [$selector]);
    }

    /**
     * @debug-gen-original-name "attribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     */
    public function attribute(string $selector, string $attribute): string
    {
        return $this->callFunc('attribute', [$selector, $attribute]);
    }

    /**
     * @debug-gen-original-name "type"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"any","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _type(mixed $selector, string $value, mixed $options = []): Browser
    {
        return $this->callFunc('type', [$selector, $value, $options]);
    }

    /**
     * @debug-gen-original-name "typeSlowly"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     * @debug-gen-original-parameter pause {"type":"integer","isOptional":false,"initializer":{"type":"numeric","value":"100"}}
     */
    public function _typeSlowly(string $selector, string $value, int $pause = 100): Browser
    {
        return $this->callFunc('typeSlowly', [$selector, $value, $pause]);
    }

    /**
     * @debug-gen-original-name "waitFor"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{ timeout?: integer; state?: 'visible' | 'hidden' | 'present' | 'missing' }","isOptional":true}
     */
    public function _waitFor(mixed $selector, mixed $options): void
    {
        $this->callFunc('waitFor', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "waitForNotPresent"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function waitForNotPresent(string $selector, mixed $options = []): void
    {
        $this->callFunc('waitForNotPresent', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "waitForTextIn"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter text {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{ timeout?: integer; ignoreCase?: boolean; missing?: boolean }","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _waitForTextIn(string $selector, mixed $text, mixed $options = []): void
    {
        $this->callFunc('waitForTextIn', [$selector, $text, $options]);
    }

    /**
     * @debug-gen-original-name "waitUntil"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter pageFunction {"type":"any","isOptional":false}
     * @debug-gen-original-parameter args {"type":"any[]","isOptional":false}
     * @debug-gen-original-parameter message {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _waitUntil(mixed $pageFunction, array $args, string $message, mixed $options = []): void
    {
        $this->callFunc('waitUntil', [$pageFunction, $args, $message, $options]);
    }

    /**
     * @debug-gen-original-name "waitUntilAttribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter message {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function waitUntilAttribute(string $selector, string $attribute, mixed $value, string $message, mixed $options = []): void
    {
        $this->callFunc('waitUntilAttribute', [$selector, $attribute, $value, $message, $options]);
    }

    /**
     * @debug-gen-original-name "waitUntilEnabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _waitUntilEnabled(string $selector, mixed $options = []): void
    {
        $this->callFunc('waitUntilEnabled', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "waitUntilDisabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _waitUntilDisabled(string $selector, mixed $options = []): void
    {
        $this->callFunc('waitUntilDisabled', [$selector, $options]);
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     * TODO implement timeout
     * 
     * @debug-gen-original-name "findAll"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["ElementHandle[]"]
     * @debug-gen-original-parameter selector {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function findAll(mixed $selector, mixed $options = []): array
    {
        return $this->callFunc('findAll', [$selector, $options]);
    }

    /**
     * @gen-returns RemoteObject[]
     * TODO gen-returns should be ElementHandle
     * 
     * @debug-gen-original-name "findOrFail"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["ElementHandle[]"]
     * @debug-gen-original-parameter selector {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _findOrFail(mixed $selector, mixed $options = []): array
    {
        return $this->callFunc('findOrFail', [$selector, $options]);
    }

    /**
     * @gen-returns RemoteObject
     * TODO gen-returns should be ElementHandle
     * 
     * @debug-gen-original-name "firstOrFail"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["ElementHandle"]
     * @debug-gen-original-parameter selector {"type":"string[] | string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function _firstOrFail(mixed $selector, mixed $options = []): RemoteObject
    {
        return $this->callFunc('firstOrFail', [$selector, $options]);
    }

    /**
     * Press the button with the given text or name.
     * 
     * @debug-gen-original-name "press"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter button {"type":"string","isOptional":false}
     */
    public function press(string $button): Browser
    {
        return $this->callFunc('press', [$button]);
    }

    /**
     * Press the button with the given text or name.
     * 
     * @debug-gen-original-name "pressAndWaitFor"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter button {"type":"string","isOptional":false}
     */
    public function pressAndWaitFor(string $button): Browser
    {
        return $this->callFunc('pressAndWaitFor', [$button]);
    }

    /**
     * Assert that the page title is the given value.
     * 
     * @debug-gen-original-name "assertTitle"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter title {"type":"string","isOptional":false}
     */
    public function assertTitle(string $title): Browser
    {
        return $this->callFunc('assertTitle', [$title]);
    }

    /**
     * Assert that the page title contains the given value.
     * 
     * @debug-gen-original-name "assertTitleContains"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter title {"type":"string","isOptional":false}
     */
    public function assertTitleContains(string $title): Browser
    {
        return $this->callFunc('assertTitleContains', [$title]);
    }

    /**
     * @debug-gen-original-name "assertHasCookie"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     */
    public function _assertHasCookie(string $name): Browser
    {
        return $this->callFunc('assertHasCookie', [$name]);
    }

    /**
     * @debug-gen-original-name "assertCookieMissing"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     */
    public function _assertCookieMissing(string $name): Browser
    {
        return $this->callFunc('assertCookieMissing', [$name]);
    }

    /**
     * @debug-gen-original-name "assertCookieValue"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function _assertCookieValue(string $name, string $value): Browser
    {
        return $this->callFunc('assertCookieValue', [$name, $value]);
    }

    /**
     * @debug-gen-original-name "assertSee"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter text {"type":"string","isOptional":false}
     * @debug-gen-original-parameter ignoreCase {"type":"boolean","isOptional":false,"initializer":{"type":"false"}}
     */
    public function assertSee(string $text, bool $ignoreCase = false): Browser
    {
        return $this->callFunc('assertSee', [$text, $ignoreCase]);
    }

    /**
     * @debug-gen-original-name "assertDontSee"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter text {"type":"string","isOptional":false}
     * @debug-gen-original-parameter ignoreCase {"type":"boolean","isOptional":false,"initializer":{"type":"false"}}
     */
    public function assertDontSee(string $text, bool $ignoreCase = false): Browser
    {
        return $this->callFunc('assertDontSee', [$text, $ignoreCase]);
    }

    /**
     * @debug-gen-original-name "assertSeeIn"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter text {"type":"string","isOptional":false}
     * @debug-gen-original-parameter ignoreCase {"type":"any","isOptional":false,"initializer":{"type":"false"}}
     */
    public function assertSeeIn(string $selector, string $text, mixed $ignoreCase = false): Browser
    {
        return $this->callFunc('assertSeeIn', [$selector, $text, $ignoreCase]);
    }

    /**
     * @debug-gen-original-name "assertDontSeeIn"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter text {"type":"string","isOptional":false}
     * @debug-gen-original-parameter ignoreCase {"type":"any","isOptional":false,"initializer":{"type":"false"}}
     */
    public function assertDontSeeIn(string $selector, string $text, mixed $ignoreCase = false): Browser
    {
        return $this->callFunc('assertDontSeeIn', [$selector, $text, $ignoreCase]);
    }

    /**
     * @debug-gen-original-name "assertSeeAnythingIn"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function assertSeeAnythingIn(string $selector): Browser
    {
        return $this->callFunc('assertSeeAnythingIn', [$selector]);
    }

    /**
     * @debug-gen-original-name "assertSeeNothingIn"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function assertSeeNothingIn(string $selector): Browser
    {
        return $this->callFunc('assertSeeNothingIn', [$selector]);
    }

    /**
     * @debug-gen-original-name "assertScript"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter expression {"type":"string","isOptional":false}
     * @debug-gen-original-parameter expected {"type":"any","isOptional":false,"initializer":{"type":"true"}}
     */
    public function assertScript(string $expression, mixed $expected = true): Browser
    {
        return $this->callFunc('assertScript', [$expression, $expected]);
    }

    /**
     * @debug-gen-original-name "assertSourceHas"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter code {"type":"string","isOptional":false}
     */
    public function assertSourceHas(string $code): Browser
    {
        return $this->callFunc('assertSourceHas', [$code]);
    }

    /**
     * @debug-gen-original-name "assertSourceMissing"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter code {"type":"string","isOptional":false}
     */
    public function assertSourceMissing(string $code): Browser
    {
        return $this->callFunc('assertSourceMissing', [$code]);
    }

    /**
     * Assert that the given link is present on the page
     * 
     * @debug-gen-original-name "assertSeeLink"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter link {"type":"string","isOptional":false}
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false,"initializer":{"type":"string","value":"a"}}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertSeeLink(string $link, string $selector = 'a', mixed $options = []): Browser
    {
        return $this->callFunc('assertSeeLink', [$link, $selector, $options]);
    }

    /**
     * Assert that the given link is not present on the page
     * 
     * @debug-gen-original-name "assertDontSeeLink"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter link {"type":"string","isOptional":false}
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false,"initializer":{"type":"string","value":"a"}}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertDontSeeLink(string $link, string $selector = 'a', mixed $options = []): Browser
    {
        return $this->callFunc('assertDontSeeLink', [$link, $selector, $options]);
    }

    /**
     * @debug-gen-original-name "assertInputValue"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"any","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertInputValue(mixed $field, string $value): Browser
    {
        return $this->callFunc('assertInputValue', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertInputValueIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"any","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertInputValueIsNot(mixed $field, string $value): Browser
    {
        return $this->callFunc('assertInputValueIsNot', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "resolveForTyping"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     */
    public function resolveForTyping(string $selector): void
    {
        $this->callFunc('resolveForTyping', [$selector]);
    }

    /**
     * @debug-gen-original-name "resolveForChecking"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter field {"type":"string|null","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function resolveForChecking(mixed $field, mixed $value = null): void
    {
        $this->callFunc('resolveForChecking', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "resolveForRadioSelection"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter field {"type":"string|null","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function resolveForRadioSelection(mixed $field, mixed $value = null): void
    {
        $this->callFunc('resolveForRadioSelection', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "resolveForSelection"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function resolveForSelection(string $field): void
    {
        $this->callFunc('resolveForSelection', [$field]);
    }

    /**
     * @debug-gen-original-name "resolveSelectOptions"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function resolveSelectOptions(string $field): void
    {
        $this->callFunc('resolveSelectOptions', [$field]);
    }

    /**
     * @debug-gen-original-name "resolveForField"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function resolveForField(string $field): void
    {
        $this->callFunc('resolveForField', [$field]);
    }

    /**
     * @debug-gen-original-name "resolveForButtonPress"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["ElementHandle"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function resolveForButtonPress(string $field): mixed
    {
        return $this->callFunc('resolveForButtonPress', [$field]);
    }

    /**
     * @debug-gen-original-name "inputValue"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["string"]
     * @debug-gen-original-parameter field {"type":"any","isOptional":false}
     */
    public function inputValue(mixed $field): string
    {
        return $this->callFunc('inputValue', [$field]);
    }

    /**
     * @debug-gen-original-name "assertInputPresent"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter timeout {"type":"any","isOptional":false,"initializer":{"type":"numeric","value":"5"}}
     */
    public function assertInputPresent(string $field, mixed $timeout): Browser
    {
        return $this->callFunc('assertInputPresent', [$field, $timeout]);
    }

    /**
     * @debug-gen-original-name "assertInputMissing"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter timeout {"type":"any","isOptional":false,"initializer":{"type":"numeric","value":"5"}}
     */
    public function assertInputMissing(string $field, mixed $timeout): Browser
    {
        return $this->callFunc('assertInputMissing', [$field, $timeout]);
    }

    /**
     * @debug-gen-original-name "assertChecked"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertChecked(string $field, mixed $value = null): Browser
    {
        return $this->callFunc('assertChecked', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertNotChecked"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertNotChecked(string $field, mixed $value = null): Browser
    {
        return $this->callFunc('assertNotChecked', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertIndeterminate"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertIndeterminate(string $field, mixed $value = null): Browser
    {
        return $this->callFunc('assertIndeterminate', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertRadioSelected"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertRadioSelected(string $field, string $value): Browser
    {
        return $this->callFunc('assertRadioSelected', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertRadioNotSelected"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertRadioNotSelected(string $field, mixed $value = null): Browser
    {
        return $this->callFunc('assertRadioNotSelected', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertSelected"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string[]|string","isOptional":false}
     */
    public function assertSelected(string $field, mixed $value): Browser
    {
        return $this->callFunc('assertSelected', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertNotSelected"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string[]|string","isOptional":false}
     */
    public function assertNotSelected(string $field, mixed $value): Browser
    {
        return $this->callFunc('assertNotSelected', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertSelectHasOptions"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter values {"type":"string[]","isOptional":false}
     */
    public function assertSelectHasOptions(string $field, array $values): Browser
    {
        return $this->callFunc('assertSelectHasOptions', [$field, $values]);
    }

    /**
     * @debug-gen-original-name "assertSelectMissingOptions"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter values {"type":"string[]","isOptional":false}
     */
    public function assertSelectMissingOptions(string $field, array $values): Browser
    {
        return $this->callFunc('assertSelectMissingOptions', [$field, $values]);
    }

    /**
     * @debug-gen-original-name "assertSelectHasOption"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertSelectHasOption(string $field, string $value): Browser
    {
        return $this->callFunc('assertSelectHasOption', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertSelectMissingOption"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertSelectMissingOption(string $field, string $value): Browser
    {
        return $this->callFunc('assertSelectMissingOption', [$field, $value]);
    }

    /**
     * @debug-gen-original-name "assertValue"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertValue(string $selector, string $value): Browser
    {
        return $this->callFunc('assertValue', [$selector, $value]);
    }

    /**
     * @debug-gen-original-name "assertValueIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertValueIsNot(string $selector, string $value): Browser
    {
        return $this->callFunc('assertValueIsNot', [$selector, $value]);
    }

    /**
     * private ensureElementSupportsValueAttribute(element: any, fullSelector: string): void {
     * const allowed = ['textarea', 'select', 'button', 'input', 'li', 'meter', 'option', 'param', 'progress'];
     * if (!allowed.includes(element.tagName.toLowerCase())) {
     * throw new Error(`This assertion cannot be used with the element [${fullSelector}].`);
     * }
     * }
     * 
     * @debug-gen-original-name "assertAttribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertAttribute(string $selector, string $attribute, string $value): Browser
    {
        return $this->callFunc('assertAttribute', [$selector, $attribute, $value]);
    }

    /**
     * @debug-gen-original-name "assertAttributeMissing"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     */
    public function assertAttributeMissing(string $selector, string $attribute): Browser
    {
        return $this->callFunc('assertAttributeMissing', [$selector, $attribute]);
    }

    /**
     * @debug-gen-original-name "assertAttributeContains"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertAttributeContains(string $selector, string $attribute, string $value): Browser
    {
        return $this->callFunc('assertAttributeContains', [$selector, $attribute, $value]);
    }

    /**
     * @debug-gen-original-name "assertAttributeDoesntContain"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertAttributeDoesntContain(string $selector, string $attribute, string $value): Browser
    {
        return $this->callFunc('assertAttributeDoesntContain', [$selector, $attribute, $value]);
    }

    /**
     * @debug-gen-original-name "assertAriaAttribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertAriaAttribute(string $selector, string $attribute, string $value): Browser
    {
        return $this->callFunc('assertAriaAttribute', [$selector, $attribute, $value]);
    }

    /**
     * @debug-gen-original-name "assertDataAttribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter attribute {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function assertDataAttribute(string $selector, string $attribute, string $value): Browser
    {
        return $this->callFunc('assertDataAttribute', [$selector, $attribute, $value]);
    }

    /**
     * @debug-gen-original-name "assertVisible"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertVisible(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('assertVisible', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "assertMissing"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertMissing(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('assertMissing', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "assertPresent"
     * @debug-gen-original-is-async true
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertPresent(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('assertPresent', [$selector, $options]);
    }

    /**
     * @debug-gen-original-name "assertNotPresent"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertNotPresent(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('assertNotPresent', [$selector, $options]);
    }

    /**
     * public async assertDialogOpened(message: string): Promise<Return<this>> {
     * const actual = await this.site.waitForEvent('dialog').then((d) => d.message());
     * return expects(
     * actual,
     * message,
     * ({ expected, actual }) => `Expected dialog message [${expected}] does not equal actual message [${actual}].`,
     * ).then(this.selfWithAsserts());
     * }
     * 
     * @debug-gen-original-name "assertEnabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function assertEnabled(string $field): Browser
    {
        return $this->callFunc('assertEnabled', [$field]);
    }

    /**
     * @debug-gen-original-name "assertDisabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"any","isOptional":false}
     */
    public function assertDisabled(mixed $field): Browser
    {
        return $this->callFunc('assertDisabled', [$field]);
    }

    /**
     * @debug-gen-original-name "assertButtonEnabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter button {"type":"any","isOptional":false}
     */
    public function assertButtonEnabled(mixed $button): Browser
    {
        return $this->callFunc('assertButtonEnabled', [$button]);
    }

    /**
     * @debug-gen-original-name "assertButtonDisabled"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter button {"type":"string","isOptional":false}
     */
    public function assertButtonDisabled(string $button): Browser
    {
        return $this->callFunc('assertButtonDisabled', [$button]);
    }

    /**
     * @debug-gen-original-name "assertFocused"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function assertFocused(string $field): Browser
    {
        return $this->callFunc('assertFocused', [$field]);
    }

    /**
     * @debug-gen-original-name "assertNotFocused"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter field {"type":"string","isOptional":false}
     */
    public function assertNotFocused(string $field): Browser
    {
        return $this->callFunc('assertNotFocused', [$field]);
    }

    /**
     * @debug-gen-original-name "assertVue"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertVue(string $key, mixed $value, mixed $componentSelector = null): Browser
    {
        return $this->callFunc('assertVue', [$key, $value, $componentSelector]);
    }

    /**
     * @debug-gen-original-name "assertVueIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertVueIsNot(string $key, mixed $value, mixed $componentSelector = null): Browser
    {
        return $this->callFunc('assertVueIsNot', [$key, $value, $componentSelector]);
    }

    /**
     * @debug-gen-original-name "assertVueContains"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertVueContains(string $key, mixed $value, mixed $componentSelector = null): Browser
    {
        return $this->callFunc('assertVueContains', [$key, $value, $componentSelector]);
    }

    /**
     * @debug-gen-original-name "assertVueDoesntContain"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertVueDoesntContain(string $key, mixed $value, mixed $componentSelector = null): Browser
    {
        return $this->callFunc('assertVueDoesntContain', [$key, $value, $componentSelector]);
    }

    /**
     * @debug-gen-original-name "assertVueDoesNotContain"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertVueDoesNotContain(string $key, mixed $value, mixed $componentSelector = null): Browser
    {
        return $this->callFunc('assertVueDoesNotContain', [$key, $value, $componentSelector]);
    }

    /**
     * @debug-gen-original-name "vueAttribute"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["any"]
     * @debug-gen-original-parameter componentSelector {"type":"string | null","isOptional":false}
     * @debug-gen-original-parameter key {"type":"string","isOptional":false}
     */
    public function vueAttribute(mixed $componentSelector, string $key): mixed
    {
        return $this->callFunc('vueAttribute', [$componentSelector, $key]);
    }

    /**
     * Assert that the current URL (without the query string) matches the given string.
     * 
     * @debug-gen-original-name "assertUrlIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter url {"type":"string","isOptional":false}
     * @debug-gen-original-parameter options {"type":"{}","isOptional":false,"initializer":{"type":"object","members":[]}}
     */
    public function assertUrlIs(string $url, mixed $options = []): Browser
    {
        return $this->callFunc('assertUrlIs', [$url, $options]);
    }

    /**
     * @debug-gen-original-name "_assertLocationProperty"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter property {"type":"string","isOptional":false}
     * @debug-gen-original-parameter expected {"type":"string","isOptional":false}
     * @debug-gen-original-parameter matches {"type":"boolean","isOptional":false,"initializer":{"type":"true"}}
     * @debug-gen-original-parameter trimEnd {"type":"integer","isOptional":false,"initializer":{"type":"numeric","value":"0"}}
     */
    public function _assertLocationProperty(string $property, string $expected, bool $matches = true, int $trimEnd = 0): void
    {
        $this->callFunc('_assertLocationProperty', [$property, $expected, $matches, $trimEnd]);
    }

    /**
     * Assert that the current scheme matches the given scheme.
     * 
     * @debug-gen-original-name "assertSchemeIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter scheme {"type":"string","isOptional":false}
     */
    public function assertSchemeIs(string $scheme): Browser
    {
        return $this->callFunc('assertSchemeIs', [$scheme]);
    }

    /**
     * Assert that the current scheme does not match the given scheme.
     * 
     * @debug-gen-original-name "assertSchemeIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter scheme {"type":"string","isOptional":false}
     */
    public function assertSchemeIsNot(string $scheme): Browser
    {
        return $this->callFunc('assertSchemeIsNot', [$scheme]);
    }

    /**
     * Assert that the current URL path matches the given pattern.
     * 
     * @debug-gen-original-name "assertPathIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter scheme {"type":"string","isOptional":false}
     */
    public function assertPathIs(string $scheme): Browser
    {
        return $this->callFunc('assertPathIs', [$scheme]);
    }

    /**
     * Assert that the current URL path does not match the given path.
     * 
     * @debug-gen-original-name "assertPathIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter scheme {"type":"string","isOptional":false}
     */
    public function assertPathIsNot(string $scheme): Browser
    {
        return $this->callFunc('assertPathIsNot', [$scheme]);
    }

    /**
     * Assert that the current host matches the given host.
     * 
     * @debug-gen-original-name "assertHostIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter host {"type":"string","isOptional":false}
     */
    public function assertHostIs(string $host): Browser
    {
        return $this->callFunc('assertHostIs', [$host]);
    }

    /**
     * Assert that the current host does not match the given host.
     * 
     * @debug-gen-original-name "assertHostIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter host {"type":"string","isOptional":false}
     */
    public function assertHostIsNot(string $host): Browser
    {
        return $this->callFunc('assertHostIsNot', [$host]);
    }

    /**
     * Assert that the current port matches the given port.
     * 
     * @debug-gen-original-name "assertPortIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter port {"type":"string","isOptional":false}
     */
    public function assertPortIs(string $port): Browser
    {
        return $this->callFunc('assertPortIs', [$port]);
    }

    /**
     * Assert that the current host does not match the given host.
     * 
     * @debug-gen-original-name "assertPortIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter port {"type":"string","isOptional":false}
     */
    public function assertPortIsNot(string $port): Browser
    {
        return $this->callFunc('assertPortIsNot', [$port]);
    }

    /**
     * Assert that the current URL path begins with given path.
     * 
     * @debug-gen-original-name "assertPathBeginsWith"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter path {"type":"string","isOptional":false}
     */
    public function assertPathBeginsWith(string $path): Browser
    {
        return $this->callFunc('assertPathBeginsWith', [$path]);
    }

    /**
     * Assert that the current URL path ends with the given path.
     * 
     * @debug-gen-original-name "assertPathEndsWith"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter path {"type":"string","isOptional":false}
     */
    public function assertPathEndsWith(string $path): Browser
    {
        return $this->callFunc('assertPathEndsWith', [$path]);
    }

    /**
     * Assert that the current URL path contains the given path.
     * 
     * @debug-gen-original-name "assertPathContains"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter path {"type":"string","isOptional":false}
     */
    public function assertPathContains(string $path): Browser
    {
        return $this->callFunc('assertPathContains', [$path]);
    }

    /**
     * @debug-gen-original-name "_assertQueryStringParameter"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     * @debug-gen-original-parameter matches {"type":"boolean","isOptional":false,"initializer":{"type":"true"}}
     */
    public function _assertQueryStringParameter(string $name, mixed $value = null, bool $matches = true): void
    {
        $this->callFunc('_assertQueryStringParameter', [$name, $value, $matches]);
    }

    /**
     * @debug-gen-original-name "assertQueryStringHas"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function assertQueryStringHas(string $name, mixed $value = null): Browser
    {
        return $this->callFunc('assertQueryStringHas', [$name, $value]);
    }

    /**
     * @debug-gen-original-name "assertQueryStringMissing"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter name {"type":"string","isOptional":false}
     */
    public function assertQueryStringMissing(string $name): Browser
    {
        return $this->callFunc('assertQueryStringMissing', [$name]);
    }

    /**
     * Assert that the current URL fragment matches the given pattern.
     * 
     * @debug-gen-original-name "assertFragmentIs"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter fragment {"type":"string","isOptional":false}
     */
    public function assertFragmentIs(string $fragment): Browser
    {
        return $this->callFunc('assertFragmentIs', [$fragment]);
    }

    /**
     * Assert that the current URL fragment begins with given fragment.
     * 
     * @debug-gen-original-name "assertFragmentBeginsWith"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter fragment {"type":"string","isOptional":false}
     */
    public function assertFragmentBeginsWith(string $fragment): Browser
    {
        return $this->callFunc('assertFragmentBeginsWith', [$fragment]);
    }

    /**
     * Assert that the current URL fragment does not match the given fragment.
     * 
     * @debug-gen-original-name "assertFragmentIsNot"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter fragment {"type":"string","isOptional":false}
     */
    public function assertFragmentIsNot(string $fragment): Browser
    {
        return $this->callFunc('assertFragmentIsNot', [$fragment]);
    }

    /**
     * @debug-gen-original-name "resolver"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     * @debug-gen-original-parameter selector {"type":"string[]|string|null","isOptional":false}
     */
    public function resolver(mixed $selector): void
    {
        $this->callFunc('resolver', [$selector]);
    }

    /**
     * @debug-gen-original-name "waitForDialog"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function waitForDialog(): Browser
    {
        return $this->callFunc('waitForDialog');
    }

    /**
     * @debug-gen-original-name "assertDialogOpened"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter message {"type":"string","isOptional":false}
     */
    public function assertDialogOpened(string $message): Browser
    {
        return $this->callFunc('assertDialogOpened', [$message]);
    }

    /**
     * @debug-gen-original-name "typeInDialog"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter value {"type":"string","isOptional":false}
     */
    public function typeInDialog(string $value): Browser
    {
        return $this->callFunc('typeInDialog', [$value]);
    }

    /**
     * @debug-gen-original-name "acceptDialog"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter value {"type":"string|null","isOptional":false,"initializer":{"type":"null"}}
     */
    public function acceptDialog(mixed $value = null): Browser
    {
        return $this->callFunc('acceptDialog', [$value]);
    }

    /**
     * @debug-gen-original-name "dismissDialog"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["this"]
     */
    public function dismissDialog(): Browser
    {
        return $this->callFunc('dismissDialog');
    }

    /**
     * @debug-gen-original-name "isPage"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["void"]
     */
    public function isPage(): void
    {
        $this->callFunc('isPage');
    }
}
