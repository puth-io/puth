<?php

namespace tests\Browser;

use Puth\Laravel\Browser;
use Puth\Laravel\Keyboard;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithKeyboardTest extends PuthTestCase
{
    public static bool $debug = false;

    function test_keyboard_special_keys()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->clear('#properties-value input')
                ->keys('#properties-value input', $text = 'äöü', '{ctrl}acvv', '-')
                ->assertInputValue('#properties-value input', $text . $text . '-');
        });
    }
    
    function test_keyboard_with_keyboard()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->clear('#properties-value input')
                ->keys('#properties-value input', $text = 'äöü')
                ->withKeyboard(function (Keyboard $keyboard) {
                    $keyboard->press('ctrl')
                        ->press('a')
                        ->release('a')
                        ->press('c')
                        ->release('c')
                        ->press('v')
                        ->release('v')
                        ->press('v')
                        ->release('v')
                        ->release('ctrl')
                        ->type('-');
                        
                })
                ->assertInputValue('#properties-value input', $text . $text . '-');
        });
    }
}
