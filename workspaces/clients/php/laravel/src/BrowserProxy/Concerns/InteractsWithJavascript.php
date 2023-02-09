<?php

namespace Puth\Laravel\BrowserProxy\Concerns;

trait InteractsWithJavascript
{
    /**
     * Execute JavaScript within the browser.
     *
     * @param string|array $scripts
     * @return array
     */
    public function script($scripts)
    {
        return collect((array)$scripts)->map(function ($script) {
            return $this->puthPage->evaluate($script);
        })->all();
    }
}