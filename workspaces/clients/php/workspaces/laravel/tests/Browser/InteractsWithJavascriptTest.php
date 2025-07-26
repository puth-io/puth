<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithJavascriptTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_script()
    {
        $this->browse(function (Browser $browser) {
            $response = $browser->visit(new Playground)
                ->evaluate([
                    '1 + 1',
                    'window.document.location.href',
                ]);
            
            Assert::assertEquals([2, (new Playground)->url()], $response);
        });
    }
}
