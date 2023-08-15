<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithJavascriptTest extends PuthTestCase
{
    function test_script()
    {
        $this->browse(function (Browser $browser) {
            $response = $browser->visit(new Playground)
                ->script([
                    '1 + 1',
                    'window.document.location.href',
                ]);
            
            Assert::assertEquals([2, (new Playground)->url()], $response);
        });
    }
}
