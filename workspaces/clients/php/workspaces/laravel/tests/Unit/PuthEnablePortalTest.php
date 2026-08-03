<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Puth\Laravel\PuthEnablePortal;

class PuthEnablePortalTest extends TestCase
{
    public function test_trait_enables_the_portal_feature(): void
    {
        $feature = new class {
            use PuthEnablePortal;

            public function enabled(): bool
            {
                return $this->puthFeaturePortalEnabled;
            }
        };

        self::assertTrue($feature->enabled());
    }
}
