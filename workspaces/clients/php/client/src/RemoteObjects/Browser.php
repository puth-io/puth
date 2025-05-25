<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**

*/
class Browser extends RemoteObject
{
    /**
     * public $(selector: string): Promise<ElementHandle<NodeFor<string>> | null> {
     * return this.page.$(selector);
     * }
     *
     * @debug-ts-return-types this
     */
    public function visit(string $url): Browser
    {
        return $this->callFunc('visit', [$url]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function _click(string $selector, mixed $options = []): Browser
    {
        return $this->callFunc('click', [$selector, $options]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function blank(): Browser
    {
        return $this->callFunc('blank');
    }

    /**
     * @debug-ts-return-types this
     */
    public function refresh(mixed $options = []): Browser
    {
        return $this->callFunc('refresh', [$options]);
    }

    /**
     * Navigate to the previous page.
     *
     * @debug-ts-return-types this
     */
    public function back(mixed $options = []): Browser
    {
        return $this->callFunc('back', [$options]);
    }

    /**
     * Navigate to the next page.
     *
     * @debug-ts-return-types this
     */
    public function forward(mixed $options = []): Browser
    {
        return $this->callFunc('forward', [$options]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function maximize(): Browser
    {
        return $this->callFunc('maximize');
    }

    /**
     * @debug-ts-return-types object
     */
    public function bounds(): mixed
    {
        return $this->callFunc('bounds');
    }

    /**
     * @debug-ts-return-types this
     */
    public function setBounds(mixed $bounds): Browser
    {
        return $this->callFunc('setBounds', [$bounds]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function resize(mixed $width, mixed $height): Browser
    {
        return $this->callFunc('resize', [$width, $height]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function move(float $x, float $y): Browser
    {
        return $this->callFunc('move', [$x, $y]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function scrollIntoView(string $selector): Browser
    {
        return $this->callFunc('scrollIntoView', [$selector]);
    }

    /**
     * Scroll screen to element at the given selector.
     *
     * @debug-ts-return-types this
     */
    public function scrollTo(string $selector): Browser
    {
        return $this->callFunc('scrollTo', [$selector]);
    }

    /**
     * TODO fix args default value not correctly generated
     *
     * @debug-ts-return-types any
     */
    public function evaluate(string $pageFunction, array $args): mixed
    {
        return $this->callFunc('evaluate', [$pageFunction, $args]);
    }

    /**
     * @debug-ts-return-types void
     */
    public function quit(): void
    {
        $this->callFunc('quit');
    }

    /**
     * @debug-ts-return-types string
     */
    public function url(): string
    {
        return $this->callFunc('url');
    }

    /**
     * @debug-ts-return-types string
     */
    public function content(): string
    {
        return $this->callFunc('content');
    }

    /**
     * @debug-ts-return-types Viewport|null
     */
    public function viewport(): mixed
    {
        return $this->callFunc('viewport');
    }

    /**
     * @debug-ts-return-types any
     */
    public function getCookieByName(string $name): mixed
    {
        return $this->callFunc('getCookieByName', [$name]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function setCookie(array $cookies): Browser
    {
        return $this->callFunc('setCookie', [$cookies]);
    }

    /**
     * @debug-ts-return-types this
     */
    public function deleteCookie(mixed $cookies): Browser
    {
        return $this->callFunc('deleteCookie', [$cookies]);
    }

    /**
     * @debug-ts-return-types Uint8Array
     */
    public function _screenshot(mixed $options = []): mixed
    {
        return $this->callFunc('screenshot', [$options]);
    }

    /**
     * Make the browser window as large as the content
     *
     * @debug-ts-return-types this
     */
    public function fitContent(): Browser
    {
        return $this->callFunc('fitContent');
    }

    /**
     * @debug-ts-return-types this
     */
    public function disableFitOnFailure(): Browser
    {
        return $this->callFunc('disableFitOnFailure');
    }

    /**
     * @debug-ts-return-types this
     */
    public function enableFitOnFailure(): Browser
    {
        return $this->callFunc('enableFitOnFailure');
    }
}
