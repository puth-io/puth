<?php

namespace Tests\Browser;

use Exception;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class WaitsForElementsTest extends PuthTestCase
{
    function test_wait_until_script()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->waitUntil('(window.count === undefined ? window.count = 1 : true) && window.count++ && window.count >= 3');
        });
    }
    
    function test_wait_for_location()
    {
        $this->browse(function (Browser $browser) {
            $browser->waitUntil('window.location = "https://puth.dev"')
                ->waitForLocation('https://puth.dev/', 10)
                ->assertUrlIs('https://puth.dev/');
        });
    }
    
    function test_wait_for_route()
    {
        $playground = new Playground;
        
        URL::shouldReceive('route')
            ->once()
            ->andReturn($playground->url());
        
        $this->browse(function (Browser $browser) use ($playground) {
            $browser->waitUntil("window.location = '{$playground->url()}'")
                ->waitForRoute('playground')
                ->assertUrlIs($playground->url());
        });
    }
    
    function test_wait_for_reload()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->waitForReload(function (Browser $browser) {
                    $browser->refresh();
                });
            
            (new Playground)->assert($browser);
        });
    }
    
    function test_click_and_wait_for_reload()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->clickAndWaitForReload('#actions-click-reload');
            
            (new Playground)->assert($browser);
        });
    }
    
    function test_wait_until_missing_exception()
    {
        $this->browse(function (Browser $browser) {
            $this->expectException(Exception::class);
            $browser->waitUntilMissing('body', 0);
        });
    }
    
    function test_wait_for_link()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->waitForLink('https://puth.dev/')
                ->waitForInput('properties-value-input');
        });
    }
    
    function test_wait_for_event()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->click('#wait-for-event-document')
                ->waitForEvent('test-event', 'document')
                ->click('#wait-for-event-element')
                ->waitForEvent('test-event', '#wait-for-event-element');
        });
    }
    
    function test_when_available()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->whenAvailable('#querying-contains', function (Browser $browser) {
                    $browser->assertMissing('Puth');
                    
                    Assert::assertCount(2, $browser->elements('div'));
                });
        });
    }
}
