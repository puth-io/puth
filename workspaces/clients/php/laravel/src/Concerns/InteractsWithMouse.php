<?php

namespace Puth\Laravel\Concerns;

use Puth\Laravel\Keyboard;

trait InteractsWithMouse
{
    /**
     * Move the mouse by offset X and Y.
     *
     * @deprecated Can not be implemented by Puth
     *
     * @param int $xOffset
     * @param int $yOffset
     *
     * @throws \Exception
     */
    public function moveMouse($xOffset, $yOffset)
    {
        throw new \Exception('MoveMouse is currently not supported.');
        /**
         * Puppeteer only simulates a mouse but doesn't expose the internal tracking state so we can't move the mouse
         * by an offset. Puppeteer apis only work with "absolute" mouse positions.
         */
    }
    
    /**
     * Control click the element at the given selector.
     *
     * @param  string|null  $selector
     * @return $this
     */
    public function controlClick($selector = null)
    {
        return $this->withKeyboard(function (Keyboard $keyboard) use ($selector) {
            // $key = OperatingSystem::onMac() ? WebDriverKeys::META : WebDriverKeys::CONTROL;
            $key = 'Control'; // TODO check on macos
            
            $keyboard->press($key);
            $this->click($selector);
            $keyboard->release($key);
        });
    }
}
