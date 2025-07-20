<?php

namespace tests\Browser;

use Illuminate\Support\Facades\Mail;
use Puth\Laravel\Browser;
use Tests\PuthTestCase;
use PHPUnit\Framework\Assert;

class PortalTest extends PuthTestCase
{
    function test_portal_facade_fake()
    {
        Mail::fake();
        $this->browse(function (Browser $browser) {
            $browser->visit('/send/mail')
                ->assertRouteIs('send.mail');
        });
        Mail::assertSentCount(1);
    }

    function test_portal_form_url_encode()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="http://127.0.0.1:8000/?queryTest=1234" method="post">
                    <input type="text" name="form-test" value="1234">
                    <button>submit</button>
                </form>
            </body></html>');
            $browser->click('button')
                ->waitForText('form-test')
                ->assertSee('"form-test":"1234"')
                ->assertSee('"queryTest":"1234"')
            ;
        });
    }

    function test_portal_form_multipart()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="http://127.0.0.1:8000/?queryTest=1234" method="post" enctype="multipart/form-data">
                    <input type="file" name="form-single">
                    <input type="file" name="form-multiple[]" multiple>
                    <button>submit</button>
                </form>
            </body></html>');
            $browser
                ->attach('form-single', __DIR__ . '/files/test.txt')
                ->attach('form-multiple[]', [
                    __DIR__ . '/files/random.binary',
                    __DIR__ . '/files/test2.txt',
                ])
                ->click('button')
                ->waitForText('form-single');

            $content = str_replace('<html><head></head><body>', '', $browser->content());
            $content = str_replace('</body></html>', '', $content);
            $content = json_decode($content, true);

            Assert::assertEquals('1234', $content['input']['queryTest']);
            Assert::assertEquals(33, $content['files']['form-single']['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/test.txt'), base64_decode($content['files']['form-single']['content']));

            Assert::assertEquals(256, $content['files']['form-multiple'][0]['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/random.binary'), base64_decode($content['files']['form-multiple'][0]['content']));
            Assert::assertEquals(33, $content['files']['form-multiple'][1]['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/test2.txt'), base64_decode($content['files']['form-multiple'][1]['content']));
        });
    }
}
