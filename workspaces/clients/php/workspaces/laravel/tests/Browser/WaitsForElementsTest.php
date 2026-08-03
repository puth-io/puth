<?php

namespace Tests\Browser;

use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class WaitsForElementsTest extends PuthTestCase
{
    public static bool $debug = false;

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
            $browser->evaluate('window.location = "https://puth.io"');
            $browser->waitForLocation('https://puth.io/')
                ->assertUrlIs('https://puth.io/');
        });
    }

    function test_wait_for_route()
    {
        $playground = new Playground;

        URL::shouldReceive('route')
            ->once()
            ->andReturn($playground->url());

        $this->browse(function (Browser $browser) use ($playground) {
            $browser->evaluate("window.location = '{$playground->url()}'");
            $browser->waitForRoute('mocked return')
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
            $this->expectException(\PHPUnit\Framework\ExpectationFailedException::class);
            $browser->waitUntilMissing('body', 1);
        });
    }

    function test_wait_for_link()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->waitForLink('https://puth.io/')
                ->waitForInput('properties-value-input');
        });
    }

    function test_wait_for_event()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            $browser->evaluate("setTimeout(() => document.dispatchEvent(new Event('test-event')), 1000)");
            $browser->waitForEvent('test-event', 'document');
            $browser->evaluate("setTimeout(() => document.querySelector('#wait-for-event-element').dispatchEvent(new Event('test-event')), 1000)");
            $browser->waitForEvent('test-event', '#wait-for-event-element');
        });
    }

    function test_wait_for_event_timeout()
    {
        $this->expectException(\PHPUnit\Framework\ExpectationFailedException::class);

        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground);
            $browser->timeoutMultiplier = 1;

            $first = now();
            $browser->waitForEvent('test-event', '#wait-for-event-element', 100);
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

    function test_wait_until_vue()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/')
                ->waitForText('Count')
                ->waitUntilVue('count', '0', '#counter', seconds: 1)
                ->click('#add-delay')
                ->waitUntilVue('count', '1', '#counter', seconds: 3)
                ->waitUntilVueIsNot('count', '0', '#counter', seconds: 1)
                ->click('#add-delay')
                ->waitUntilVueIsNot('count', '1', '#counter', seconds: 3)
                ->assertVue('count', '2', '#counter');
        });
    }
}
