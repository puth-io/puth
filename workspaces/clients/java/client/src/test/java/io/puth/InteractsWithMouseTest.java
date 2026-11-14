package io.puth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

public class InteractsWithMouseTest extends BaseTest {
    /** Buttons that report clicks, double clicks and the mouse button, and an element that reports hovering. */
    private static final String MOUSE_PAGE = """
            <div id="actions-click">
              <button id="click" onclick="document.querySelector('#click-verify').innerText = 'clicked button'">click me</button>
              <p id="click-verify"></p>
            </div>
            <button id="double" ondblclick="document.querySelector('#double-verify').innerText = 'double clicked button'">double click</button>
            <p id="double-verify"></p>
            <button id="mousedown" onmousedown="document.querySelector('#mousedown-verify').innerText = 'mousedown: ' + event.which">mousedown event</button>
            <p id="mousedown-verify"></p>
            <div id="hover" style="height: 2rem" onmouseover="this.innerText = 'hovering'" onmouseleave="this.innerText = ''"></div>
            """;

    @Test
    void test_mouse_control_click() {
        browser.setContent("<html><body>" +
                "<a href=\"" + fixture() + "\" " +
                "onclick=\"event.preventDefault(); " +
                "document.querySelector('#result').innerHTML = event.ctrlKey ? '1' : '0';\">fixture</a>" +
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
                .assertSeeIn("#result", "2")
                .doubleClick()
                .assertSeeIn("#result", "4")
                .rightClick()
                .assertSeeIn("#result", "5");
    }

    @Test
    void test_mouse_click_at_point() {
        var btn = "#actions-click > button";

        var point = browser.setContent("<div style=\"height: 150vh\"></div>" + MOUSE_PAGE)
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

            browser.setContent(MOUSE_PAGE)
                    .click("not-an-element");
        });
    }

    @Test
    void test_concern_interacts_with_mouse() {
        browser.setContent(MOUSE_PAGE)
                .click("#actions-click > button")
                .assertSeeIn("#click-verify", "clicked button")
                .doubleClick("#double")
                .assertSeeIn("#double-verify", "double clicked button")
                .rightClick("#mousedown")
                .assertSeeIn("#mousedown-verify", "mousedown: 3")
                .mouseover("#hover")
                .assertSeeIn("#hover", "hovering");

        browser.setContent(MOUSE_PAGE)
                .clickAtXPath("//*[@id=\"actions-click\"]/*")
                .assertSeeIn("#actions-click", "clicked button");

        assertThrows(AssertionError.class, () -> {
            browser.clickAtXPath("//*[@id=\"non-existing-element-id\"]");
        });
    }
}
