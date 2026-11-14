package io.puth;

import org.opentest4j.AssertionFailedError;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

public class InteractsWithElementsTest extends BaseTest {

    @Test
    void test_click_link() {
        browser.setContent("<a href=\"#destination\" onclick=\"document.querySelector('#result').textContent = 'clicked'; return false;\">Read the docs</a><div id=\"result\"></div>")
                .clickLink("Read the docs")
                .assertSee("clicked");
    }

//    TODO implement attach functions. FILE_PAGE needs an <input type="file" name="file-test-input" multiple>
//    whose change listener reads the files into #file-attach-preview.
//    @Test
//    void test_attach() throws Exception {
//        Path file = Paths.get("files", "test.txt");
//        String content = Files.readString(file);
//
//        browser.setContent(FILE_PAGE)
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
//        browser.setContent(FILE_PAGE)
//                .attach("file-test-input", new String[]{file1.toString(), file2.toString()})
//                .assertSeeIn("#file-attach-preview", expected);
//    }

    @Test
    void test_type_keys() {
        browser.setContent("<input id=\"actions-type\" type=\"text\">")
                .type("#actions-type", "test-1234")
                .append("#actions-type", "{Ctrl}{a}{Delete}")
                .assertValue("#actions-type", "")
                .type("#actions-type", "test-1234")
                .append("#actions-type", "{Shift}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}")
                .append("#actions-type", "5")
                .assertValue("#actions-type", "test-5")
                .append("#actions-type", "{Control}{a}{Delete}")
                .assertValue("#actions-type", "")
                .keys("#actions-type", new String[]{"a", "b", "c"})
                .assertValue("#actions-type", "abc")
                .keys("#actions-type", "{Backspace}")
                .assertValue("#actions-type", "ab")
                .keys("#actions-type", new String[]{"{Backspace}", "d", "e"})
                .assertValue("#actions-type", "ade")
                .keys("#actions-type", new String[]{"d", "e", "{Control}{a}{Delete}"})
                .assertValue("#actions-type", "");
        // TODO pptr bug https://github.com/puppeteer/puppeteer/issues/9770
        // browser.type("#actions-type", "{Shift}test")
        //        .assertValue("#actions-type", "t");
    }

    @Test
    void test_click_exception() {
        AssertionFailedError error = assertThrows(AssertionFailedError.class, () -> {
            browser.setContent("<body><button style=\"display: none\">test</button></body>");
            browser.click("button");
        });

        assertTrue(error.getMessage().contains("Element [button] is not actionable: it is not visible"));
    }

    @Test
    void test_move_mouse_exception() {
        // In JUnit, failed expectations typically throw AssertionError
        assertThrows(AssertionError.class, () -> browser.moveMouse(0, 0));
    }
}
