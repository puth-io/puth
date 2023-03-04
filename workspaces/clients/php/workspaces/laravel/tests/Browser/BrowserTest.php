<?php

namespace Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class BrowserTest extends PuthDuskTestCase
{
    function test_fit_content()
    {
        $this->browse(function (Browser $browser) {
            $page = $browser->site;
            
            $browser->resize(800, 600);
            
            $page->setContent('<html><body style="margin: 0"><div id="test" style="width: 2000px; height: 3000px;">test</div></body></html>');
            
            Assert::assertEquals(['width' => 800, 'height' => 600], (array)$page->viewport());
            
            $browser->waitFor('#test')
                ->fitContent();
            
            Assert::assertEquals(['width' => 2000, 'height' => 3000], (array)$page->viewport());
        });
    }
    
    function test_within_iframe()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->withinFrame('#iframe-example', function (Browser $iframe) {
                    $iframe->assertUrlIs('https://puth.dev/');
                });
        });
    }
    
//    function test_parallel()
//    {
//        $this->browse(function (Browser $browser) {
//            $browser->visit(new Playground)
//                ->parallel(fn() => [
//                    $browser->waitForEvent('event'),
//                    $browser->click('#test'),
//                ]);
//        });
//    }
}
