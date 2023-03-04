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
}