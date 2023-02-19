<?php

namespace Tests\Browser;

use Puth\Laravel\Browser\Browser;
use Puth\Laravel\Browser\Concerns\LegacyBrowserHandling;
use Puth\Laravel\PuthDuskTestCase;
use Tests\Browser\Pages\Playground;

class InteractsWithDialogTest extends PuthDuskTestCase
{
    use LegacyBrowserHandling;
    
    function test_dialogs()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                // alert
                ->click('#dialog-alert')
                ->waitForDialog()
                ->acceptDialog()
                // prompt
                ->click('#dialog-prompt')
                ->acceptDialog('prompt answer')
                ->assertSee('prompt answer')
                // confirm
                ->click('#dialog-confirm')
                ->acceptDialog()
                ->assertSee('true');
        });
    }
    
    function test_assertions()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->click('#dialog-confirm')
                ->assertDialogOpened('confirm this')
                ->dismissDialog();
        });
    }
}