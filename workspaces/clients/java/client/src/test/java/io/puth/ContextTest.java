package io.puth;

import io.puth.client.Context;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
