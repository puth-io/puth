<?php

namespace Tests\Browser;

use PHPUnit\Framework\Assert;
use Illuminate\Support\Carbon;
use Puth\Laravel\Browser;
use Tests\Browser\Pages\Fixture;
use Tests\PuthTestCase;

class AllMethodsTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_querying_elements()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent(<<<'HTML'
<div id="querying-get">Div with id querying-get</div>
<div class="querying-get">Div with class querying-get</div>
<div class="querying-get">Div with class querying-get</div>
HTML);

            Assert::assertCount(2, $browser->elements('.querying-get'));
            Assert::assertCount(1, $browser->elements('#querying-get'));
        });
    }

    function test_press()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent(<<<'HTML'
<button onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button>
<p id="verify"></p>
<button onclick="this.disabled = true; setTimeout(() => this.disabled = false, 2000)">click and wait</button>
HTML)
                ->press('click me')
                ->assertSeeIn('#verify', 'clicked button')
                ->pressAndWaitFor('click and wait')
                ->assertButtonEnabled('click and wait');
        });
    }

    function test_select()
    {
        $this->browse(function (Browser $browser) {
            $page = <<<'HTML'
<select id="single">
  <option value="" selected disabled>-- Select Value --</option>
  <option value="apple">Apple</option>
  <option value="orange">Orange</option>
</select>
<select id="multiple" multiple>
  <option value="apple">Apple</option>
  <option value="orange">Orange</option>
</select>
HTML;

            $browser->setContent($page)
                ->select('#multiple', ['apple', 'orange'])
                ->assertSelected('#multiple', ['apple', 'orange'])
                ->select('#multiple', 'orange')
                ->assertSelected('#multiple', 'orange')
                ->assertSelected('#single', '')
                ->select('#single', 'orange')
                ->assertSelected('#single', 'orange');

            // Without a value, a random option gets selected
            $browser->setContent($page)
                ->select('#multiple');
            Assert::assertNotEmpty($browser->element('#multiple')->value);
        });
    }

    function test_navigation()
    {
        $this->browse(function (Browser $browser) {
            $next = config('puth.alt');
            $fixture = config('puth.fixture');

            $browser->visit($fixture)
                ->assertUrlIs($fixture)
                ->visit($next)
                ->assertUrlIs($next)
                ->back()
                ->assertUrlIs($fixture)
                ->forward()
                ->assertUrlIs($next)
                ->refresh()
                ->assertUrlIs($next);
        });
    }

    function test_resize()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<p>Resize me</p>');

            $browser->resize(300, 400);
            $viewport = $browser->viewport();

            static::assertEquals([300, 400], [
                $viewport->width,
                $viewport->height,
            ]);

            $browser->resize(600, 800);
            $viewport = $browser->viewport();

            static::assertEquals([600, 800], [
                $viewport->width,
                $viewport->height,
            ]);
        });
    }

    function test_interacts_with_cookies()
    {
        $this->browse(function (Browser $browser) {
            // Cookies need an HTTP origin
            $browser->visit(new Fixture)
                ->cookie('encrypted', '1234', Carbon::tomorrow())
                ->assertCookieValue('encrypted', '1234');
        });
    }

    /**
     * A page for the assertions of MakesAssertions.
     */
    private function assertionsPage(): string
    {
        $alt = config('puth.alt');

        return <<<HTML
<!doctype html>
<html>
<head><title>Assertions | Puth</title></head>
<body>
  <nav class="navbar"><a href="{$alt}">Alternate origin</a></nav>
  <p>A page for assertions</p>
  <div class="example">
    <div class="querying-get">Div with class querying-get</div>
  </div>
  <input type="text" id="value" value="input with value">
  <input type="text" id="type">
  <div id="attributes" data-test="1234" aria-rowspan="5678">div with data and aria attribute</div>
  <input type="checkbox" id="checkbox" value="test-1234" name="checkbox">
  <input type="radio" id="radio-apple" value="apple" name="radio">
  <input type="radio" id="radio-orange" value="orange" name="radio">
  <select id="select-multiple" multiple>
    <option value="apple">Apple</option>
    <option value="orange">Orange</option>
  </select>
  <input type="text" id="focus">
  <button id="disabled" disabled>disabled</button>
  <button id="enabled">double click</button>
</body>
</html>
HTML;
    }

    function test_concern_makes_assertions()
    {
        $this->browse(function (Browser $browser) {
            // Cookies need an HTTP origin, setContent keeps it
            $browser->visit(new Fixture)
                ->setContent($this->assertionsPage())
                ->assertTitle('Assertions | Puth')
                ->assertTitleContains('Assertions')
                ->assertPlainCookieValue('non-existing', '')
                ->plainCookie('plain', '1234')
                ->assertCookieValue('plain', '1234', false)
                ->assertHasPlainCookie('plain')
                ->assertPlainCookieValue('plain', '1234')
                ->deleteCookie('plain')
                ->assertPlainCookieMissing('plain')
                ->addCookie('test', '5678')
                ->assertHasCookie('test')
                ->assertCookieValue('test', '5678')
                ->deleteCookie('test')
                ->assertCookieMissing('test')
                ->assertSee('page for assertions')
                ->assertSeeIn('.querying-get', 'Div')
                ->assertSeeIn('.example', 'Div')
                ->assertDontSee('This text does not exists')
                ->assertDontSeeIn('.querying-get', 'This text does not exists')
                ->assertScript('1+1', 2)
                ->assertSourceHas('<title>Assertions | Puth</title>')
                ->assertSourceMissing('<div>__not in dom__</div>')
                ->assertSeeLink(config('puth.alt'))
                ->assertDontSeeLink('https://notalink.io')
                ->assertVisible('.navbar')
                ->assertPresent('.navbar')
                ->assertNotPresent('#not-existing-element')
                ->assertMissing('missingelement')
                ->assertInputValue('#value', 'input with value')
                ->assertInputValueIsNot('#value', 'not the correct value')
                ->check('#checkbox')
                ->assertChecked('#checkbox')
                ->uncheck('#checkbox', 'test-1234')
                ->assertNotChecked('#checkbox')
                ->radio('radio', 'orange')
                ->assertRadioSelected('radio', 'orange')
                ->assertRadioNotSelected('radio', 'apple')
                ->select('#select-multiple', ['apple', 'orange'])
                ->assertSelected('#select-multiple', ['apple', 'orange'])
                ->assertNotSelected('#select-multiple', 'not-selected')
                ->assertSelectHasOptions('#select-multiple', ['apple', 'orange'])
                ->assertSelectMissingOptions('#select-multiple', ['not-an-options'])
                ->assertSelectHasOption('#select-multiple', 'orange')
                ->assertSelectMissingOption('#select-multiple', 'not-an-options')
                ->type('#type', 'test-1234')
                ->assertValue('#type', 'test-1234')
                ->append('#type', '-')
                ->assertValueIsNot('#type', 'test-1234')
                ->assertAttribute('#type', 'type', 'text')
                ->assertDataAttribute('#attributes', 'test', '1234')
                ->assertAriaAttribute('#attributes', 'rowspan', '5678')
                ->assertEnabled('#focus')
                ->assertDisabled('#disabled')
                ->assertButtonDisabled('#disabled')
                ->assertButtonEnabled('#enabled')
                ->assertButtonEnabled('double click')
                ->click('#focus')
                ->assertFocused('#focus')
                ->assertNotFocused('#type')
            ;
        });
    }

    // TODO implement missing inverse tests
    function test_concern_makes_assertions_inverse()
    {
        $this->browse(function (Browser $browser) {
            $inverse = function (string $message, \Closure $closure) {
                try {
                    $closure();
                    $this->fail('Closure didn\'t throw any exception');
                } catch (\PHPUnit\Framework\ExpectationFailedException $e) {
                    if (!str_contains($e->getMessage(), $message)) {
                        throw new \PHPUnit\Framework\ExpectationFailedException("Failed asserting that '{$e->getMessage()}' contains '{$message}'");
                    }
                }
            };

            $browser->setContent($this->assertionsPage());
            $browser->timeout = 500;
            $browser->timeoutMultiplier = 1;

            $inverse('Did not see expected text [This text does not exists] within element [.querying-get]', fn() => $browser->assertSeeIn('.querying-get', 'This text does not exists'));
            $inverse('Saw unexpected text [Div] within element [.querying-get]', fn() => $browser->assertDontSeeIn('.querying-get', 'Div'));
            $inverse('JavaScript expression [1+1] mismatched', fn() => $browser->assertScript('1+1', 3));
            $inverse('Did not find expected source code [<div>__not in dom__</div>]', fn() => $browser->assertSourceHas('<div>__not in dom__</div>'));
            $inverse('Found unexpected source code [<title>Assertions | Puth</title>]', fn() => $browser->assertSourceMissing('<title>Assertions | Puth</title>'));

            $inverse("Waited 500ms for selector [body a[href='https://notalink.io/']]", fn() => $browser->assertSeeLink('https://notalink.io/'));
            $inverse('Waited 500ms for selector [body #not-existing-element]', fn() => $browser->assertVisible('body #not-existing-element'));
        });
    }

    function test_assert_see_anything_exception()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<div id="empty"></div>');

            $this->expectException('PHPUnit\Framework\ExpectationFailedException');
            $browser->assertSeeAnythingIn('#empty');
        });
    }

    function test_concern_makes_url_assertions()
    {
        $this->browse(function (Browser $browser) {
            $fixture = parse_url(config('puth.fixture'));

            $browser->visit(config('puth.fixture').'first/second?param1=abc#starts-1234')
                ->assertUrlIs(config('puth.fixture').'first/second?param1=abc#starts-1234')
                ->assertSchemeIs($fixture['scheme'])
                ->assertSchemeIsNot('ftp')
                ->assertHostIs($fixture['host'])
                ->assertHostIsNot('not.the.host')
                ->assertPortIs($fixture['port'])
                ->assertPortIsNot(12345)
                ->assertPathIs('/first/second')
                ->assertPathBeginsWith('/first')
                ->assertPathEndsWith('/second')
                ->assertPathContains('st/se')
                ->assertPathIsNot('/not-path')
                ->assertFragmentIs('starts-1234')
                ->assertFragmentBeginsWith('starts')
                ->assertFragmentIsNot('test-not')
                ->assertQueryStringHas('param1')
                ->assertQueryStringHas('param1', 'abc')
                ->assertQueryStringMissing('test');
        });
    }

    function test_wip()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(config('puth.fixture').'first/second?param1=abc#starts-1234')
                ->evaluate('setTimeout(_ => window.location.href = "'.config('puth.alt').'", 250)');
            $browser->assertUrlIs(config('puth.alt'));
        });
    }

    function test_concerns_interacts_with_elements_values()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent(<<<'HTML'
<div id="text">Div with id text</div>
<input type="text" id="value">
<input type="text" id="type">
HTML)
                ->value('#value', 'test-1234')
                ->assertValue('#value', 'test-1234')
                ->assertAttribute('#type', 'type', 'text')
                ->assertAttributeMissing('#type', 'missing-attribute')
                ->assertAttributeContains('#type', 'type', 'xt')
                ->assertAttributeDoesntContain('#type', 'type', 'wrong-value');

            static::assertEquals('test-1234', $browser->value('#value'));
            static::assertEquals('Div with id text', $browser->text('#text'));
            static::assertEquals('text', $browser->attribute('#type', 'type'));

            $browser->type('#type', '12')
                ->assertValue('#type', '12')
                ->type('#type', '34')
                ->assertValue('#type', '34')
                ->typeSlowly('#type', '56')
                ->assertValue('#type', '56')
                ->append('#type', '78')
                ->assertValue('#type', '5678')
                ->appendSlowly('#type', '90')
                ->assertValue('#type', '567890')
                ->clear('#type')
                ->assertValue('#type', '');
        });
    }
}
