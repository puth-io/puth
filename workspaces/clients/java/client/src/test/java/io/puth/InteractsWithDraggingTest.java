package io.puth;

import org.junit.jupiter.api.Test;

public class InteractsWithDraggingTest extends BaseTest {
    /** A draggable item, and a drop zone framed by thin draggable handles on each side. */
    private static final String DRAG_PAGE = """
            <style>.handle { background: steelblue; }</style>
            <div id="item" draggable="true" ondragstart="event.dataTransfer.setData('text', 'dragged-item')">Drag this</div>
            <div id="top" class="handle" draggable="true" style="height: 5px"></div>
            <div style="display: flex">
              <div id="left" class="handle" draggable="true" style="width: 5px"></div>
              <div id="dropzone" style="flex-grow: 1; height: 4rem"
                   ondragover="event.preventDefault()"
                   ondrop="this.innerText = 'dropped element text: ' + event.dataTransfer.getData('text')">into here</div>
              <div id="right" class="handle" draggable="true" style="width: 5px"></div>
            </div>
            <div id="bottom" class="handle" draggable="true" style="height: 5px"></div>
            """;

    @Test
    void test_drag_and_drop() {
        browser.setContent(DRAG_PAGE)
                .drag("#item", "#dropzone")
                .assertSeeIn("#dropzone", "dropped element text: dragged-item");
    }

    @Test
    void test_drag_down() {
        browser.setContent(DRAG_PAGE)
                .dragDown("#top", 5);
    }

    @Test
    void test_drag_left() {
        browser.setContent(DRAG_PAGE)
                .dragLeft("#right", 5);
    }

    @Test
    void test_drag_up() {
        browser.setContent(DRAG_PAGE)
                .dragUp("#bottom", 5);
    }

    @Test
    void test_drag_right() {
        browser.setContent(DRAG_PAGE)
                .dragRight("#left", 5);
    }
}
