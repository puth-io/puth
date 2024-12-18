<?php

use Puth\Laravel\Browser;
use Tests\Browser\Pages\Playground;
use Tests\PuthTestCase;

class InteractsWithDraggingTest extends PuthTestCase
{
    function test_drag_and_drop()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->drag('#draganddrop-example1-item', '#draganddrop-example1-dropzone-result-container')
                ->assertSeeIn('#draganddrop-example1-dropzone-result-container', 'draganddrop-example1-item');
        });
    }
    
    function test_drag_down()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->dragDown('#draganddrop-example1-item-top', 5);
        });
    }
    
    function test_drag_left()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->dragLeft('#draganddrop-example1-item-right', 5);
        });
    }
    
    function test_drag_up()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->dragUp('#draganddrop-example1-item-bottom', 5);
        });
    }
    
    function test_drag_right()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new Playground)
                ->dragRight('#draganddrop-example1-item-left', 5);
        });
    }
}
