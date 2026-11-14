<?php

namespace Tests\Browser;

use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Fixture;
use Tests\PuthTestCase;

class WaitsForElementsTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_wait_until_script()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<p>Counting</p>')
                ->waitUntil('(window.count === undefined ? window.count = 1 : true) && window.count++ && window.count >= 3');
        });
    }

    function test_wait_for_location()
    {
        $this->browse(function (Browser $browser) {
            $browser->evaluate('window.location = "'.config('puth.alt').'"');
            $browser->waitForLocation(config('puth.alt'))
                ->assertUrlIs(config('puth.alt'));
        });
    }

    function test_wait_for_route()
    {
        $fixture = new Fixture;

        URL::shouldReceive('route')
            ->once()
            ->andReturn($fixture->url());

        $this->browse(function (Browser $browser) use ($fixture) {
            $browser->evaluate("window.location = '{$fixture->url()}'");
            $browser->waitForRoute('mocked return')
                ->assertUrlIs($fixture->url());
        });
    }

    function test_wait_for_reload()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Fixture)
                ->waitForReload(function (Browser $browser) {
                    $browser->refresh();
                });

            (new Fixture)->assert($browser);
        });
    }

    function test_click_and_wait_for_reload()
    {
        $this->browse(function (Browser $browser) {
            // A reload needs a URL, setContent keeps the one of the fixture page
            $browser->visit(new Fixture)
                ->setContent('<title>Reload</title><button id="reload" onclick="location.reload()">click for reload</button>')
                ->clickAndWaitForReload('#reload');

            (new Fixture)->assert($browser);
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
            $browser->setContent('<a href="'.config('puth.alt').'">Alternate origin</a><input type="text" name="name">')
                ->waitForLink(config('puth.alt'))
                ->waitForInput('name');
        });
    }

    function test_wait_for_event()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<button id="wait-for-event-element">event target</button>');
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
            $browser->setContent('<button id="wait-for-event-element">event target</button>');
            $browser->timeoutMultiplier = 1;

            $first = now();
            $browser->waitForEvent('test-event', '#wait-for-event-element', 100);
        });
    }

    function test_when_available()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent(<<<'HTML'
<h1>Puth</h1>
<div id="querying-contains">
  <div>Text containing apple</div>
  <div>Text containing apple</div>
</div>
HTML)
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
