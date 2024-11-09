<?php

namespace Browser;

use Error;
use Illuminate\Support\Str;
use PHPUnit\Framework\Assert;
use Puth\Exceptions\UnreachableActionException;
use Puth\Laravel\Browser;
use Puth\Proxies\FileChooser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class BrowserTest extends PuthTestCase
{
    function test_browser_fit_content()
    {
        $this->browse(function (Browser $browser) {
            $page = $browser->site;
            
            $browser->resize(800, 600);
            $page->setContent('<html><body style="margin: 0"><div id="test" style="width: 2000px; height: 3000px;">test</div></body></html>');
            Assert::assertEquals(['width' => 800, 'height' => 600], (array)$page->viewport());
            
            $browser->waitFor('#test')->fitContent();
            Assert::assertEquals(['width' => 2000, 'height' => 3000], (array)$page->viewport());
        });
    }
    
    function test_browser_maximize()
    {
        $this->browse(function (Browser $browser) {
            $browser->maximize();
            $bounds = $browser->bounds();
            
            $browser->resize($bounds->width - 100, $bounds->height - 100);
            $boundsUpdated = $browser->bounds();
            Assert::assertNotEquals($bounds->width, $boundsUpdated->width);
            Assert::assertNotEquals($bounds->height, $boundsUpdated->height);
            
            $browser->maximize();
            $boundsUpdated = $browser->bounds();
            Assert::assertEquals($bounds->width, $boundsUpdated->width);
            Assert::assertEquals($bounds->height, $boundsUpdated->height);
        });
    }
    
    function test_browser_move()
    {
        $this->browse(function (Browser $browser) {
            $bounds = $browser->bounds();
            $browser->move($bounds->left + 100, $bounds->top + 100);
            $boundsUpdated = $browser->bounds();
            Assert::assertEquals($bounds->left + 100, $boundsUpdated->left);
            Assert::assertEquals($bounds->top + 100, $boundsUpdated->top);
        });
    }
    
    function test_browser_ensure_jquery_is_available()
    {
        $this->browse(function (Browser $browser) {
            $browser->site->setContent('');
            Assert::assertTrue($browser->site->evaluate('window.jQuery == null'));
            $browser->ensurejQueryIsAvailable();
            Assert::assertFalse($browser->site->evaluate('window.jQuery == null'));
        });
    }
    
    function test_within_iframe()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->withinFrame('#iframe-example', function (Browser $iframe) {
                    $iframe->assertUrlIs('https://puth.dev/');
                });
        });
    }
    
    function test_store_console_log()
    {
        $this->browse(function (Browser $browser) {
            $browser->script('console.log("abc")');
    
            $fileName = 'test-run-' . Str::random();
            
            $browser->storeConsoleLog($fileName);
            
            $filePath = __DIR__ . '/console/' . $fileName . '.log';
            $console = json_decode(file_get_contents($filePath), true);
            
            unlink($filePath);
    
            Assert::assertEquals('log', $console[0]['messageType']);
            Assert::assertEquals(['abc'], $console[0]['args']);
            Assert::assertEquals('abc', $console[0]['text']);
        });
    }
    
    function test_catch_throwable()
    {
        $this->expectException(Error::class);
        
        $this->browse(function (Browser $browser) {
            throw new Error('test');
        });
    }
    
    function test_parallel_all()
    {
        $this->browse(function (Browser $browser) {
            $site = $browser->site;
            
            $browser->visit(new Playground)
                ->all(fn() => [
                    $site->waitForNavigation(),
                    $site->click('a[href="https://puth.dev/docs"]'),
                ])
                ->assertUrlIs('https://puth.dev/docs/');
        });
    }
    
    function test_parallel_any()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->any(fn() => [
                    $browser->site->waitForDialog(),
                    $browser->site->click('#dialog-prompt'),
                ], function ($dialog) {
                    $dialog->accept('1234');
                })
                ->assertSeeIn('#dialog-prompt-result', '1234');
        });
    }
    
    function test_parallel_race()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->race(fn($site) => [
                    $site->waitForDialog(),
                    $site->click('#dialog-prompt'),
                ], function ($dialog) {
                    $dialog->accept('1234');
                })
                ->assertSeeIn('#dialog-prompt-result', '1234');
        });
    }
    
    function test_file_chooser_multiple()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->all(fn($site) => [
                    $site->waitForFileChooser(),
                    $site->click('#file-test-input'),
                ], function (FileChooser $fileChooser) {
                    $fileChooser->accept([
                        __DIR__ . '/files/test.txt',
                        __DIR__ . '/files/test2.txt',
                    ]);
                })
                ->waitForTextIn('#file-attach-preview', 'test.txt content' . 'test2.txt content')
                ->assertSeeIn('#file-attach-preview', 'test.txt content' . 'test2.txt content');
        });
    }
    
    function test_unreachable_action_exception()
    {
        $this->expectException(UnreachableActionException::class);
        
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->all(fn($site) => [
                    $site->click('')->unreachable(),
                ]);
        });
    }
}
