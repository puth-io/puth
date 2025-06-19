<?php

namespace Tests\Browser;

use Puth\Laravel\Browser;
use Puth\Laravel\Concerns\LegacyBrowserHandling;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithDialogTest extends PuthTestCase
{
    use LegacyBrowserHandling;

    public static bool $debug = true;

    function test_dialogs()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                // alert
                ->click('#dialog-alert')
                ->waitForDialog()
                ->acceptDialog()
//                ->assertSee('Puth')
//                ->waitForDialog()
//                ->acceptDialog()
//                // prompt
//                ->click('#dialog-prompt')
//                ->acceptDialog('prompt answer')
//                ->assertSee('prompt answer')
//                // confirm
//                ->click('#dialog-confirm')
//                ->acceptDialog()
//                ->assertSee('true')
            ;
        });
    }

//    function test_assertions()
//    {
//        $this->browse(function (Browser $browser) {
//            $browser->visit(new Playground)
//                ->click('#dialog-confirm')
//                ->assertDialogOpened('confirm this')
//                ->dismissDialog();
//        });
//    }
}
