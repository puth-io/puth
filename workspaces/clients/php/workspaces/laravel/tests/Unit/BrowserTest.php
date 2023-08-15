<?php

namespace Tests\Unit;

use Exception;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class BrowserTest extends PuthTestCase
{
    function test_wip()
    {
        $this->browse(function (Browser $browser1, Browser $browser2) {
            Assert::assertIsObject($browser1);
            Assert::assertIsObject($browser2);
            Assert::assertNotEquals($browser1, $browser2);
        });
    }
    
    function test_multiple_browsers()
    {
        $this->browse(function (Browser $browser1, Browser $browser2) {
            Assert::assertIsObject($browser1);
            Assert::assertIsObject($browser2);
            Assert::assertNotEquals($browser1, $browser2);
        });
    }
    
    function test_can_capture_failures()
    {
        $this->expectException(Exception::class);
        
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            
            throw new Exception();
        });
        
        // TODO validate screenshot exists
    }
    
    function test_can_store_source()
    {
        $this->expectException(Exception::class);
        
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->storeSource(Str::random());
            
            throw new Exception();
        });
        
        // TODO validate screenshot exists
    }
    
    function test_pause()
    {
        $this->browse(function (Browser $browser) {
            $browser->pause(1)
                ->pauseIf(true, 1)
                ->pauseIf(false, 1)
                ->pauseUnless(true, 1)
                ->pauseUnless(false, 1);
        });
        
        $this->expectNotToPerformAssertions();
    }
    
    function test_elsewhere()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->within('#querying-contains', function (Browser $browser) {
                    $browser->assertSee('Text containing apple')
                        ->assertDontSee('Puth')
                        ->assertDontSee('with this innerhtml')
                        ->elsewhere('#properties-innerhtml', function (Browser $browser) {
                            $browser->assertSee('with this innerhtml')
                                ->assertDontSee('Puth')
                                ->assertDontSee('Text containing apple');
                        })
                        ->elsewhereWhenAvailable('#properties-innerhtml', function (Browser $browser) {
                            $browser->assertSee('with this innerhtml')
                                ->assertDontSee('Puth')
                                ->assertDontSee('Text containing apple');
                        });
                });
        });
    }
    
    function test_scroll_to()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->scrollTo('#actions-click-button');
            
            Assert::assertTrue(
                $browser->element('#actions-click-button')->isIntersectingViewport(),
            );
        });
    }
    
    function test_blank()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->assertUrlIs((new Playground)->url())
                ->blank();
            
            Assert::assertEquals('about:blank', $browser->site->url());
        });
    }
    
    function test_visit_route()
    {
        $playground = new Playground;
        
        URL::shouldReceive('route')
            ->once()
            ->andReturn($playground->url());
        
        $this->browse(function (Browser $browser) use ($playground) {
            $browser->visitRoute('playground')
                ->assertUrlIs($playground->url());
        });
    }
//
//    function test_log_capture()
//    {
//        Puth::captureLog();
//        Log::info('1234', [$this]);
//        Puth::releaseLog();
//
//        dd(Puth::getFormattedLog());
//    }
}
