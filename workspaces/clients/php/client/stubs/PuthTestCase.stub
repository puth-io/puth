<?php

namespace Tests;

use Puth\Laravel\TestCase as BaseTestCase;

abstract class PuthTestCase extends BaseTestCase
{
    use CreatesApplication;

    public function getLaunchOptions(): array
    {
        return [
            'defaultViewport' => [
                'width' => 1280,
                'height' => 720,
            ],
        ];
    }
}
