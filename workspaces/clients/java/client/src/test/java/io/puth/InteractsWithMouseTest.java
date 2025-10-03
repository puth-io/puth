package io.puth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

public class InteractsWithMouseTest extends BaseTest {

    @Test
    void test_mouse_control_click() {
        browser.setContent("<html><body>" +
                "<a href=\"https://playground.puth.dev\" " +
                "onclick=\"event.preventDefault(); " +
                "document.querySelector('#result').innerHTML = event.ctrlKey ? '1' : '0';\">playground</a>" +
                "<div id=\"result\"></div></body></html>");

        browser.controlClick("a")
                .assertSeeIn("#result", "1");
    }

    @Test
    void test_mouse_click_without_selector() {
        browser.setContent("<html><body>" +
                "<button onmouseup=\"let a = document.querySelector('#result'); " +
                "a.innerHTML = `${parseInt(a.innerText) + 1}`;\">test</button>" +
                "<div id=\"result\">0</div></body></html>");

        browser.click("button")
                .assertSeeIn("#result", "1")
                // assert virtual mouse stays in position
                .clickAndHold()
                .releaseMouse()
                .assertSeeIn("#result", "3")
                .doubleClick()
                .assertSeeIn("#result", "5")
                .rightClick()
                .assertSeeIn("#result", "6");
    }

    @Test
    void test_mouse_click_at_point() {
        var btn = "#actions-click > button";

        var point = browser.visit(playground())
                .scrollIntoView(btn)
                .clickablePoint(btn);

        browser.clickAtPoint(((Number) point.get("x")).intValue(), ((Number) point.get("y")).intValue())
                .assertSeeIn("#actions-click", "clicked button");
    }

    @Test
    void test_mouse_click_exception() {
        assertThrows(AssertionError.class, () -> {
            browser.setTimeout(250);
            browser.setTimeoutMultiplier(1);

            browser.visit(playground())
                    .click("not-an-element");
        });
    }

    @Test
    void test_concern_interacts_with_mouse() {
        browser.visit(playground())
                .click("#actions-click > button")
                .assertSeeIn("#actions-click-verify", "clicked button")
                .doubleClick("#actions-click-double")
                .assertSeeIn("#actions-click-double-verify", "double clicked button")
                .rightClick("#actions-click-mousedown")
                .assertSeeIn("#actions-click-mousedown-verify", "mousedown: 3")
                .mouseover("#actions-hover")
                .assertSeeIn("#actions-hover", "hovering");

        browser.visit(playground())
                .clickAtXPath("//*[@id=\"actions-click\"]/*")
                .assertSeeIn("#actions-click", "clicked button");

        assertThrows(AssertionError.class, () -> {
            browser.clickAtXPath("//*[@id=\"non-existing-element-id\"]");
        });
    }
}
