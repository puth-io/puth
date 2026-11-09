package io.puth;

import io.puth.client.Context;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;

import org.opentest4j.AssertionFailedError;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class ContextTest {

    @Test
    void creates_a_context_without_options() {
        Context context = Context.create(BaseTest.instance());

        try {
            Browser browser = context.createBrowserShim();
            browser.visit(BaseTest.playground());
            assertEquals("Playground | Puth", browser.title());
        } finally {
            context.destroy();
        }
    }

    @Test
    void counts_passed_assertions() {
        Context context = Context.create(BaseTest.instance());

        try {
            Browser browser = context.createBrowserShim();
            browser.visit(BaseTest.playground());
            assertEquals(0, context.getAssertionCount());

            browser.assertTitle("Playground | Puth").assertTitleContains("Playground");
            assertEquals(2, context.getAssertionCount());

            assertThrows(AssertionFailedError.class, () -> browser.setTimeout(100).assertTitle("Not the title"));
            assertEquals(2, context.getAssertionCount());
        } finally {
            context.destroy();
        }
    }
}
