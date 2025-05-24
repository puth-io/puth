<?php

namespace Puth\RemoteObjects;

use Puth\RemoteObject;

/**

*/
class Browser extends RemoteObject
{
    /**
     * @debug-ts-return-types this
     */
    public function visit(string $url): Browser
    {
        return $this->callFunc('visit', [$url]);
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
