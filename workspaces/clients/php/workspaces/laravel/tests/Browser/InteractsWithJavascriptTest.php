<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class InteractsWithJavascriptTest extends PuthDuskTestCase
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