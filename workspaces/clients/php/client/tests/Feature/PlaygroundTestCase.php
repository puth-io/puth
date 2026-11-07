<?php

namespace Tests\Feature;

use Puth\PuthTestCase;

abstract class PlaygroundTestCase extends PuthTestCase
{
    public function getBaseUrl(): ?string
    {
        return rtrim(getenv('PUTH_FIXTURE_URL') ?: 'http://127.0.0.1:8081', '/') . '/';
    }
}
