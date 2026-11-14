<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Fixture;
use Tests\PuthTestCase;

class InteractsWithJavascriptTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_script()
    {
        $this->browse(function (Browser $browser) {
            $response = $browser->visit(new Fixture)
                ->script([
                    '1 + 1',
                    'window.document.location.href',
                ]);
            
            Assert::assertEquals([2, (new Fixture)->url()], $response);
        });
    }

    function test_evaluate_calls_functions_with_arguments()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><head><title>Puth</title></head><body></body></html>');

            Assert::assertSame('Puth', $browser->evaluate('document.title'));
            Assert::assertSame('Puth', $browser->evaluate('() => document.title'));
            Assert::assertSame(3, $browser->evaluate('(a, b) => a + b', [1, 2]));
            Assert::assertSame(3, $browser->evaluate('async function (a, b) { return a + b; }', [1, 2]));
            Assert::assertSame(3, $browser->evaluate('((a, b) => a + b)(1, 2)'));
            Assert::assertSame(2, $browser->evaluate('let value = 1; value + 1'));
        });
    }
}
