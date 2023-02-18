<?php

namespace Tests\Browser;

use Exception;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class WaitsForElementsTest extends PuthDuskTestCase
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
    
    function test_wait_until()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissing('#wait-for-missing-text-item')
                ->waitFor('#wait-for-missing-text-item')
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissingText('click button to hide this element')
                ->waitForText('click button to hide this element')
                ->click('#wait-for-missing-text-button')
                ->waitUntilMissingText('click button to hide this element')
                ->waitForTextIn('#wait-for-missing-text-container', 'click button to hide this element')
                ->click('#wait-for-present-text-button')
                ->waitFor('#wait-for-present-text-item')
                ->waitUntilMissing('#wait-for-present-text-item')
                ->click('#wait-for-present-text-button')
                ->waitForText('clicked button to show this element')
                ->waitUntilMissingText('clicked button to show this element')
                ->click('#actions-click-wait')
                ->waitUntilDisabled('#actions-click-wait')
                ->waitUntilEnabled('#actions-click-wait')
                ->click('#actions-click-wait')
                ->waitUntilEnabled('#actions-click-disabled')
                ->waitUntilDisabled('#actions-click-disabled');
        });
    }
}