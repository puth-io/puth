<?php

namespace tests\Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithKeyboardTest extends PuthTestCase
{
    function test_keyboard()
    {
        $this->browse(function (Browser $browser) {
            $response = $browser->visit(new Playground)
                ->keys('#properties-value input', ['{shift}', 'taylor'], 'swift');
        });
    }
}
