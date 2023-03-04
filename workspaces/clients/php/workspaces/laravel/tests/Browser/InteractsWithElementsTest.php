<?php

namespace Browser;

use Puth\Laravel\Browser\Browser;
use Puth\Laravel\Browser\Concerns\LegacyBrowserHandling;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class InteractsWithElementsTest extends PuthDuskTestCase
{
    use LegacyBrowserHandling;
    
    function test_click_link()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->clickLink('https://puth.dev/docs')
                ->assertUrlIs('https://puth.dev/docs/');
        });
    }
    
    function test_attach()
    {
        $this->browse(function (Browser $browser) {
            $testFile = __DIR__ . '/files/test.txt';
    
            $browser->visit(new Playground)
                ->attach('file-test-input', $testFile);
            
            $browser->assertSeeIn('#file-attach-preview', file_get_contents($testFile));
        });
    }
    
    function test_attach_multiple()
    {
        $this->browse(function (Browser $browser) {
            $files = [
                __DIR__ . '/files/test.txt',
                __DIR__ . '/files/test2.txt',
            ];
            
            $browser->visit(new Playground)
                ->attach('file-test-input', $files);
            
            $browser->assertSeeIn('#file-attach-preview', implode(array_map(
                fn($path) => file_get_contents($path),
                $files,
            )));
        });
    }
    
    function test_type_keys()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->type('#actions-type input', 'test-1234')
                ->append('#actions-type input', '{Ctrl}{a}{Delete}')
                ->assertValue('#actions-type input', '')
                ->type('#actions-type input', 'test-1234')
                ->append('#actions-type input', '{Shift}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
                ->append('#actions-type input', '5')
                ->assertValue('#actions-type input', 'test-5')
                ->append('#actions-type input', '{Control}{a}{Delete}')
                ->assertValue('#actions-type input', '')
                ->keys('#actions-type input', 'a', 'b', 'c')
                ->assertValue('#actions-type input', 'abc')
                ->keys('#actions-type input', '{Backspace}')
                ->assertValue('#actions-type input', 'ab')
                ->keys('#actions-type input', '{Backspace}', ['d', 'e'])
                ->assertValue('#actions-type input', 'ade')
                ->keys('#actions-type input', ['d', 'e'], '{Control}{a}{Delete}')
                ->assertValue('#actions-type input', '');
//                TODO pptr bug https://github.com/puppeteer/puppeteer/issues/9770
//                ->type('#actions-type input', '{Shift}test')
//                ->assertValue('#actions-type input', 't');
                
        });
    }
}