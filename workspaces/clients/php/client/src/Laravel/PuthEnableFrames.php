<?php

namespace Puth\Laravel;

/**
 * Records the frames Chrome paints for every test of the class, in addition to the DOM. A single test can call
 * $this->context->enableFrames() instead.
 */
trait PuthEnableFrames
{
    protected bool $puthFeatureFramesEnabled = true;
}
