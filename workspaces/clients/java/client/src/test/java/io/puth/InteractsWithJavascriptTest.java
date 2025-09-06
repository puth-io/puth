package io.puth;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

public class InteractsWithJavascriptTest extends BaseTest {

    @Test
    void test_script() {
        Object[] response = browser.visit(playground())
                .evaluate(new String[]{
                        "1 + 1",
                        "window.document.location.href"
                });

        assertArrayEquals(new Object[]{2, "https://playground.puth.dev/"}, response);
    }
}
