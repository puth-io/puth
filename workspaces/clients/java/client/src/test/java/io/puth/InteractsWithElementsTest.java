package io.puth;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

public class InteractsWithElementsTest extends BaseTest {

    @Test
    void test_click_link() {
        browser.visit(playground())
                .clickLink("https://puth.io/docs/0_x")
                .waitForLocation("https://puth.io/docs/0_x")
                .assertUrlIs("https://puth.io/docs/0_x");
    }

//    TODO implement attach functions
//    @Test
//    void test_attach() throws Exception {
//        Path file = Paths.get("files", "test.txt");
//        String content = Files.readString(file);
//
//        browser.visit(playground())
//                .attach("file-test-input", file.toString())
//                .assertSeeIn("#file-attach-preview", content);
//    }
//
//    @Test
//    void test_attach_multiple() throws Exception {
//        Path file1 = Paths.get("files", "test.txt");
//        Path file2 = Paths.get("files", "test2.txt");
//
//        String expected = Files.readString(file1) + Files.readString(file2);
//
//        browser.visit(playground())
//                .attach("file-test-input", new String[]{file1.toString(), file2.toString()})
//                .assertSeeIn("#file-attach-preview", expected);
//    }

    @Test
    void test_type_keys() {
        browser.visit(playground())
                .type("#actions-type input", "test-1234")
                .append("#actions-type input", "{Ctrl}{a}{Delete}")
                .assertValue("#actions-type input", "")
                .type("#actions-type input", "test-1234")
                .append("#actions-type input", "{Shift}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}")
                .append("#actions-type input", "5")
                .assertValue("#actions-type input", "test-5")
                .append("#actions-type input", "{Control}{a}{Delete}")
                .assertValue("#actions-type input", "")
                .keys("#actions-type input", new String[]{"a", "b", "c"})
                .assertValue("#actions-type input", "abc")
                .keys("#actions-type input", "{Backspace}")
                .assertValue("#actions-type input", "ab")
                .keys("#actions-type input", new String[]{"{Backspace}", "d", "e"})
                .assertValue("#actions-type input", "ade")
                .keys("#actions-type input", new String[]{"d", "e", "{Control}{a}{Delete}"})
                .assertValue("#actions-type input", "");
        // TODO pptr bug https://github.com/puppeteer/puppeteer/issues/9770
        // browser.type("#actions-type input", "{Shift}test")
        //        .assertValue("#actions-type input", "t");
    }

    @Test
    void test_click_exception() {
        Exception ex = assertThrows(Exception.class, () -> {
            browser.setContent("<body><button style=\"display: none\">test</button></body>");
            browser.click("button");
        });
        // Optional: verify message pattern similar to PHP test
        assertTrue(
                ex.getMessage() != null &&
                        ex.getMessage().matches("(?s).*Function click threw error: Node is either not clickable or not an Element.*"),
                "Unexpected exception message: " + ex.getMessage()
        );
    }

    @Test
    void test_move_mouse_exception() {
        // In JUnit, failed expectations typically throw AssertionError
        assertThrows(AssertionError.class, () -> browser.moveMouse(0, 0));
    }
}
