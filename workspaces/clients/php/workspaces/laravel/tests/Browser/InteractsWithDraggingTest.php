<?php

namespace Tests\Browser;

use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class InteractsWithDraggingTest extends PuthTestCase
{
    public static bool $debug = false;

    /**
     * A drop zone framed by four 5px wide draggable handles.
     */
    private function dragPage(): string
    {
        return <<<'HTML'
<style>
  .handle { background: #0b5ed7; }
  .row { display: flex; }
</style>
<div id="item" draggable="true" ondragstart="event.dataTransfer.setData('text', 'dragged-item')">Drag this</div>
<div id="top" class="handle" draggable="true" style="height: 5px"></div>
<div class="row">
  <div id="left" class="handle" draggable="true" style="width: 5px"></div>
  <div
    id="dropzone"
    style="flex-grow: 1; height: 4rem"
    ondragover="event.preventDefault()"
    ondragenter="document.querySelector('#result').innerText = 'dragging over...'"
    ondragleave="document.querySelector('#result').innerText = 'into here'"
    ondrop="document.querySelector('#result').innerText = 'dropped element text: ' + event.dataTransfer.getData('text')"
  >
    <div id="result" style="pointer-events: none">into here</div>
  </div>
  <div id="right" class="handle" draggable="true" style="width: 5px"></div>
</div>
<div id="bottom" class="handle" draggable="true" style="height: 5px"></div>
HTML;
    }

    function test_drag_and_drop()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent($this->dragPage())
                ->drag('#item', '#dropzone')
                ->assertSeeIn('#dropzone', 'dropped element text: dragged-item');
        });
    }
    
    function test_drag_down()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent($this->dragPage())
                ->dragDown('#top', 5);
        });
    }
    
    function test_drag_left()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent($this->dragPage())
                ->dragLeft('#right', 5);
        });
    }
    
    function test_drag_up()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent($this->dragPage())
                ->dragUp('#bottom', 5);
        });
    }
    
    function test_drag_right()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent($this->dragPage())
                ->dragRight('#left', 5);
        });
    }
}
