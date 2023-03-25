<?php

namespace Tests\Unit;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Tests\PuthTestCase;

class LaunchOptionsTest extends PuthTestCase
{
    
    function test_viewport()
    {
        $this->browse(function (Browser $browser) {
            Assert::assertEquals(['width' => 1234, 'height' => 789], (array)$browser->site->viewport());
        });
    }
}