<?php

namespace Browser;

use PHPUnit\Framework\Assert;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\PuthDuskTestCase;

class BrowserTest extends PuthDuskTestCase
{
    function test_fit_content()
    {
        $this->browse(function (Browser $browser) {
            $page = $browser->puthPage;
            
            $browser->resize(800, 600);
            
            $page->setContent('<html><body style="margin: 0"><div id="test" style="width: 2000px; height: 3000px;">test</div></body></html>');
            
            Assert::assertEquals(['width' => 800, 'height' => 600], (array)$page->viewport());
            
            $browser->waitFor('#test')
                ->fitContent();
    
            Assert::assertEquals(['width' => 2000, 'height' => 3000], (array)$page->viewport());
        });
    }
}
