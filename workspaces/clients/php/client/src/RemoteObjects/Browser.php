<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**

*/
class Browser extends RemoteObject
{
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
     * TODO fix args default value not correctly generated
     * 
     * @debug-gen-original-name "evaluate"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["any"]
     * @debug-gen-original-parameter pageFunction {"type":"string","isOptional":false}
     * @debug-gen-original-parameter args {"type":"any[]","isOptional":false}
     */
    public function evaluate(string $pageFunction, array $args): mixed
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
     * @debug-gen-original-parameter cookies {"type":"any[]|string","isOptional":false}
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
     * @debug-gen-original-returns ["this"]
     * @debug-gen-original-parameter selector {"type":"string","isOptional":false}
     * @debug-gen-original-parameter value {"type":"any","isOptional":false}
     */
    public function value(string $selector, mixed $value): Browser
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
     * @debug-gen-original-parameter selector {"type":"string[]|string","isOptional":false}
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
     * @gen-returns RemoteObject
     * 
     * @debug-gen-original-name "__findOrFail"
     * @debug-gen-original-is-async false
     * @debug-gen-original-returns ["ElementHandle"]
     * @debug-gen-original-parameter selector {"type":"string[]|string","isOptional":false}
     */
    public function __findOrFail(mixed $selector): RemoteObject
    {
        return $this->callFunc('__findOrFail', [$selector]);
    }
}
