<?php

namespace Browser;

use Error;
use Illuminate\Support\Str;
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
    
    function test_store_console_log()
    {
        $this->browse(function (Browser $browser) {
            $browser->script('console.log("abc")');
    
            $fileName = 'test-run-' . Str::random();
            
            $browser->storeConsoleLog($fileName);
            
            $filePath = __DIR__ . '/console/' . $fileName . '.log';
            $console = json_decode(file_get_contents($filePath), true);
            
            unlink($filePath);
    
            Assert::assertEquals('log', $console[0]['messageType']);
            Assert::assertEquals(['abc'], $console[0]['args']);
            Assert::assertEquals('abc', $console[0]['text']);
        });
    }
    
    function test_catch_throwable()
    {
        $this->expectException(Error::class);
        
        $this->browse(function (Browser $browser) {
            throw new Error('test');
        });
    }
    
//    function test_parallel()
//    {
//        $this->browse(function (Browser $browser) {
//            $browser->visit(new Playground)
//                ->parallel(fn() => [
//                    $browser->waitForEvent('event'),
//                    $browser->click('#test'),
//                ], function ($result) {
//                    
//                });
//        });
//    }
}
