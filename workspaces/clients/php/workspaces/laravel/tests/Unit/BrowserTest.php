<?php

namespace Tests\Unit;

use Exception;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Fixture;
use Tests\PuthTestCase;

class BrowserTest extends PuthTestCase
{
    function test_multiple_browsers()
    {
        $this->browse(function (Browser $browser1, Browser $browser2) {
            $browser1->setContent('<div id="a">a</div>');
            $browser2->setContent('<div id="b">b</div>');
            
            $browser1->assertVisible('#a')
                ->assertMissing('#b');
            $browser2->assertVisible('#b')
                ->assertMissing('#a');
        });
    }
    
    function test_can_capture_failures()
    {
        $this->expectException(Exception::class);
        
        $this->browse(function (Browser $browser) {
            $browser->setContent('<p>Failing test</p>');
            
            throw new Exception();
        });
        
        // TODO validate screenshot exists
    }
    
    function test_can_store_source()
    {
        $this->expectException(Exception::class);
        
        $this->browse(function (Browser $browser) {
            $browser->setContent('<p>Stored source</p>')
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
            $browser->setContent(<<<'HTML'
<h1>Puth</h1>
<div id="querying-contains">
  <div>Text containing apple</div>
  <div>Text containing apple</div>
</div>
<div id="properties-innerhtml"><div>child div</div> with this innerhtml</div>
HTML)
                ->within('#querying-contains', function (Browser $browser) {
                    $browser->assertSee('Text containing apple')
                        ->assertDontSee('Puth')
                        ->assertDontSee('with this innerhtml')
                        ->elsewhere('#properties-innerhtml', function (Browser $browser) {
                            $browser->assertSee('with this innerhtml')
                                ->assertDontSee('Puth')
                                ->assertDontSee('Text containing apple');
                        })
                        ->elsewhere('', function (Browser $browser) {
                            $browser->assertSee('Puth')
                                ->assertSee('with this innerhtml');
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
            $browser->setContent('<div style="height: 2000px"></div><button id="actions-click-button">click me</button>')
                ->scrollTo('#actions-click-button');

            Assert::assertTrue(
                $browser->element('#actions-click-button')->isIntersectingViewport(),
            );
        });
    }
    
    function test_blank()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Fixture)
                ->assertUrlIs((new Fixture)->url())
                ->blank();
            
            Assert::assertEquals('about:blank', $browser->url());
        });
    }
    
    function test_visit_route()
    {
        $fixture = new Fixture;
        
        URL::shouldReceive('route')
            ->once()
            ->andReturn($fixture->url());
        
        $this->browse(function (Browser $browser) use ($fixture) {
            $browser->visitRoute('fixture')
                ->assertUrlIs($fixture->url());
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

    function test_browser_blank()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(config('puth.alt'))
                ->assertUrlIs(config('puth.alt'))
                ->blank()
                ->assertUrlIs('about:blank');
        });
    }
}
