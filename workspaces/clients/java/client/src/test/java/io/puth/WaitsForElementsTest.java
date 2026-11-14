package io.puth;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class WaitsForElementsTest extends BaseTest {
    /** Buttons that dispatch "test-event" on the document or on themselves one second after a click. */
    private static final String EVENT_PAGE = """
            <button id="wait-for-event-document" onclick="setTimeout(() => document.dispatchEvent(new Event('test-event')), 1000)">document event</button>
            <button id="wait-for-event-element" onclick="setTimeout(() => this.dispatchEvent(new Event('test-event')), 1000)">element event</button>
            """;

    @Test
    void test_wait_until_script() {
        browser.setContent("<p>Counting</p>")
                .waitUntil("(window.count === undefined ? window.count = 1 : true) && window.count++ && window.count >= 3");
    }

    @Test
    void test_wait_for_location() {
        browser.evaluate("window.location = \"" + alt() + "\"");
        browser.waitForLocation(alt())
                .assertUrlIs(alt());
    }

    @Test
    void test_wait_until_missing_exception() {
        assertThrows(AssertionError.class, () -> browser.waitUntilMissing("body", 1));
    }

    @Test
    void test_wait_for_link() {
        browser.setContent("<a href=\"" + alt() + "\">Alternate origin</a><input name=\"properties-value-input\">")
                .waitForLink(alt())
                .waitForInput("properties-value-input");
    }

    @Test
    void test_wait_for_event() {
        browser.setContent(EVENT_PAGE)
                .click("#wait-for-event-document")
                .waitForEvent("test-event", "document")
                .click("#wait-for-event-element")
                .waitForEvent("test-event", "#wait-for-event-element");
    }

    @Test
    void test_wait_for_event_timeout() {
        browser.setContent(EVENT_PAGE);
        browser.setTimeoutMultiplier(1);

        long firstStart = System.currentTimeMillis();
        assertThrows(AssertionError.class, () -> browser.waitForEvent("test-event", "#wait-for-event-element", 100));
        long firstElapsed = System.currentTimeMillis() - firstStart;
        assertTrue(firstElapsed < 500, "Expected < 500ms, got " + firstElapsed + "ms");
    }

//    @Test
//    void test_when_available() {
//        browser.setContent("<div id=\"querying-contains\"><div>Text containing apple</div><div>Text containing apple</div></div>")
//                .whenAvailable("#querying-contains", b -> {
//                    b.assertMissing("Puth");
//                    List<?> divs = b.elements("div");
//                    assertEquals(2, divs.size());
//                });
//    }

//    @Test
//    void test_wait_until_vue() {
//        browser.visit("/")
//                .waitForText("Count")
//                .waitUntilVue("count", "0", "#counter", 1)
//                .click("#add-delay")
//                .waitUntilVue("count", "1", "#counter", 3)
//                .waitUntilVueIsNot("count", "0", "#counter", 1)
//                .click("#add-delay")
//                .waitUntilVueIsNot("count", "1", "#counter", 3)
//                .assertVue("count", "2", "#counter");
//    }
}
