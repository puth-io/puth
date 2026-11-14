<?php

namespace Browser;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\ExpectationFailedException;
use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class InteractsWithElementsTest extends PuthTestCase
{
    public static bool $debug = false;

    private function fileAttachmentPage(): string
    {
        return <<<'HTML'
<input id="file-test-input" name="file-test-input" type="file" multiple>
HTML;
    }

    function test_click_link()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<a href="#destination" onclick="document.querySelector(\'#result\').textContent = \'clicked\'; return false;">Read the docs</a><div id="result"></div>')
                ->clickLink('Read the docs')
                ->assertSee('clicked');
        });
    }
    
    function test_attach()
    {
        $this->browse(function (Browser $browser) {
            $content = file_get_contents(__DIR__ . '/files/test.txt');

            $attachedContent = $browser->setContent($this->fileAttachmentPage())
                ->attach('file-test-input', __DIR__ . '/files/test.txt')
                ->evaluate("document.querySelector('#file-test-input').files[0].text()");

            Assert::assertSame($content, $attachedContent);
        });
    }
    
    function test_attach_multiple()
    {
        $this->browse(function (Browser $browser) {
            $content = file_get_contents(__DIR__ . '/files/test.txt') . file_get_contents(__DIR__ . '/files/test2.txt');

            $attachedContent = $browser->setContent($this->fileAttachmentPage())
                ->attach('file-test-input', [
                    __DIR__ . '/files/test.txt',
                    __DIR__ . '/files/test2.txt',
                ])
                ->evaluate("Promise.all(Array.from(document.querySelector('#file-test-input').files, file => file.text())).then(files => files.join(''))");

            Assert::assertSame($content, $attachedContent);
        });
    }
    
    function test_type_keys()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<input type="text">')
                ->type('input', 'test-1234')
                ->append('input', '{Ctrl}{a}{Delete}')
                ->assertValue('input', '')
                ->type('input', 'test-1234')
                ->append('input', '{Shift}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
                ->append('input', '5')
                ->assertValue('input', 'test-5')
                ->append('input', '{Control}{a}{Delete}')
                ->assertValue('input', '')
                ->keys('input', 'a', 'b', 'c')
                ->assertValue('input', 'abc')
                ->keys('input', '{Backspace}')
                ->assertValue('input', 'ab')
                ->keys('input', '{Backspace}', ['d', 'e'])
                ->assertValue('input', 'ade')
                ->keys('input', ['d', 'e'], '{Control}{a}{Delete}')
                ->assertValue('input', '');
//                TODO pptr bug https://github.com/puppeteer/puppeteer/issues/9770
//                ->type('input', '{Shift}test')
//                ->assertValue('input', 't');
        
        });
    }
    
    function test_click_exception()
    {
        $this->expectException(ExpectationFailedException::class);
        $this->expectExceptionMessageMatches('/Element \[button\] is not actionable: it is not visible/');
        
        $this->browse(function (Browser $browser) {
            $browser->setContent('<body><button style="display: none">test</button></body>');
            $browser->click('button');
        });
    }
    
    function test_move_mouse_exception()
    {
        $this->expectException(ExpectationFailedException::class);
        $this->browse(function (Browser $browser) {
            $browser->moveMouse(0, 0);
        });
    }

    function test_body_can_be_selected()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<p>Hello</p>')
                ->waitFor('body')
                ->assertSeeIn('body', 'Hello');

            Assert::assertSame('Hello', trim($browser->text('body')));
            Assert::assertSame('Hello', trim($browser->text('body > p')));
        });
    }
}
