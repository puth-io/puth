package io.puth;

import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class MakesAssertionsTest extends BaseTest {
    private static boolean testAfterClassDone = false;

    @Test
    void test_assert_missing_exception() {
        assertThrows(AssertionError.class, () -> {
            browser.setContent("<body><div></div></body>")
                    .assertMissing("div");
        });
    }

//    @Test
//    void test_stores_source_logs() throws Exception {
//        String fileName = Browser.storeSourceAt + "/" + getCallerName() + "-0.txt";
//        String html = "<html><head></head><body><div></div></body></html>";
//        File file = new File(fileName);
//
//        if (file.exists()) {
//            file.delete(); // remove old test file outputs
//        }
//
//        try {
//            browser.setContent(html)
//                    .assertSourceHas("div")
//                    .assertMissing("div");
//        } catch (Exception ignored) {
//        }
//
//        String stored = Files.readString(Path.of(fileName));
//        assertEquals(html, stored);
//    }

//    @Test
//    void test_browser_after_class() {
//        afterClass(() -> MakesAssertionsTest.testAfterClassDone = true);
//        tearDown();
//        assertTrue(MakesAssertionsTest.testAfterClassDone);
//    }

    @Test
    void test_assert_inputs() {
        browser.setContent("<body><input name=\"test\"></body>")
                .assertInputMissing("wrongname", 1)
                .assertInputPresent("test", 1);
    }

    @Test
    void test_assert_input_present_exception() {
        assertThrows(AssertionError.class, () -> {
            browser.assertInputPresent("test", 1);
        });
    }

    @Test
    void test_assert_input_missing_exception() {
        assertThrows(AssertionError.class, () -> {
            browser.setContent("<body><input name=\"test\"></body>")
                    .assertInputMissing("test", 1);
        });
    }

    @Test
    void test_assert_input_intermediate() {
        browser.setContent("<input type=\"checkbox\">" +
                        "<script>document.querySelector(\"input\").indeterminate = true</script>")
                .assertIndeterminate("input");
    }

    @Test
    void test_assert_see() {
        browser.setContent("<div id=\"a\">test</div><div id=\"b\"></div>")
                .assertSeeAnythingIn("#a")
                .assertSeeNothingIn("#b");
    }

//    @Test
//    void test_assert_vue() {
//        browser.visit("/")
//                .waitForText("Count")
//                .assertVue("count", 0, "#counter")
//                .assertVueIsNot("count", 1, "#counter")
//                .assertVueDoesntContain("array", 1, "#counter")
//                .assertVueDoesNotContain("array", 1, "#counter")
//                .click("#add")
//                .assertVue("count", 1, "#counter")
//                .assertVueIsNot("count", 0, "#counter")
//                .assertVueContains("array", 1, "#counter")
//                .assertVueIsNot("count", "0", "#counter");
//
//        assertEquals(1, browser.vueAttribute("#counter", "count"));
//    }
}
