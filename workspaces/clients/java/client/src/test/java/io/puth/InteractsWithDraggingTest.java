package io.puth;

import org.junit.jupiter.api.Test;

public class InteractsWithDraggingTest extends BaseTest {
    @Test
    void test_drag_and_drop() {
        browser.visit(playground())
                .drag("#draganddrop-example1-item", "#draganddrop-example1-dropzone-result-container")
                .assertSeeIn("#draganddrop-example1-dropzone-result-container", "draganddrop-example1-item");
    }

    @Test
    void test_drag_down() {
        browser.visit(playground())
                .dragDown("#draganddrop-example1-item-top", 5);
    }

    @Test
    void test_drag_left() {
        browser.visit(playground())
                .dragLeft("#draganddrop-example1-item-right", 5);
    }

    @Test
    void test_drag_up() {
        browser.visit(playground())
                .dragUp("#draganddrop-example1-item-bottom", 5);
    }

    @Test
    void test_drag_right() {
        browser.visit(playground())
                .dragRight("#draganddrop-example1-item-left", 5);
    }
}
