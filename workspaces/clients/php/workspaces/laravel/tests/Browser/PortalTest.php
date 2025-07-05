<?php

namespace tests\Browser;

use Illuminate\Support\Facades\Mail;
use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class PortalTest extends PuthTestCase
{
    function test_portal_laravel_facade_fake()
    {
        Mail::fake();
        $this->browse(function (Browser $browser) {
            $browser->visit('/send/mail')
                ->assertRouteIs('send.mail');
        });
        Mail::assertSentCount(1);
    }

    function test_portal_laravel_form_url_encode()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="http://127.0.0.1:8000/?queryTest=1234" method="post">
                    <input type="text" name="form-test" value="1234">
                    <button>submit</button>
                </form>
            </body></html>');
            $browser->click('button')
                ->assertSee('"form-test":"1234"')
                ->assertSee('"queryTest":"1234"')
            ;
        });
    }

    function test_portal_laravel_form_multipart()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="http://127.0.0.1:8000/" method="post">
                    <input type="file" name="form-single" value="1234">
                    <input type="file" name="form-multiple" value="1234" multiple>
                    <button>submit</button>
                </form>
            </body></html>');
            $browser
                ->attach('form-single', __DIR__ . '/files/test.txt')
                ->attach('form-multiple', [
                    __DIR__ . '/files/test.txt',
                    __DIR__ . '/files/test2.txt',
                ])
                ->click('button')
                ->assertSee('"form-test":"1234"')
                ->assertSee('"queryTest":"1234"')
            ;
        });
    }
}
