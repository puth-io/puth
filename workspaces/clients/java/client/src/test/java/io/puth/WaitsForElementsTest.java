package io.puth;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class WaitsForElementsTest extends BaseTest {

    @Test
    void test_wait_until_script() {
        browser.visit(playground())
                .waitUntil("(window.count === undefined ? window.count = 1 : true) && window.count++ && window.count >= 3");
    }

    @Test
    void test_wait_for_location() {
        browser.evaluate("window.location = \"https://puth.io\"");
        browser.waitForLocation("https://puth.io/")
                .assertUrlIs("https://puth.io/");
    }

    @Test
    void test_wait_until_missing_exception() {
        assertThrows(AssertionError.class, () -> browser.waitUntilMissing("body", 1));
    }

    @Test
    void test_wait_for_link() {
        browser.visit(playground())
                .waitForLink("https://puth.io/")
                .waitForInput("properties-value-input");
    }

    @Test
    void test_wait_for_event() {
        browser.visit(playground())
                .click("#wait-for-event-document")
                .waitForEvent("test-event", "document")
                .click("#wait-for-event-element")
                .waitForEvent("test-event", "#wait-for-event-element");
    }

    @Test
    void test_wait_for_event_timeout() {
        browser.visit(playground());
        browser.setTimeoutMultiplier(1);

        long firstStart = System.currentTimeMillis();
        browser.waitForEvent("test-event", "#wait-for-event-element", 100);
        long firstElapsed = System.currentTimeMillis() - firstStart;
        assertTrue(firstElapsed < 500, "Expected < 500ms, got " + firstElapsed + "ms");

        long secondStart = System.currentTimeMillis();
        browser.waitForEvent("test-event", "document", 100);
        long secondElapsed = System.currentTimeMillis() - secondStart;
        assertTrue(secondElapsed < 500, "Expected < 500ms, got " + secondElapsed + "ms");
        assertTrue((System.currentTimeMillis() - firstStart) > 200, "Expected > 200ms total elapsed");
    }

//    @Test
//    void test_when_available() {
//        browser.visit(playground())
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
