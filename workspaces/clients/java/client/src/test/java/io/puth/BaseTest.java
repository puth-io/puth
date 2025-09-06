package io.puth;

import io.puth.client.Context;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.TestInfo;

import java.util.Map;

public class BaseTest {
    Context context;
    Browser browser;

    @BeforeEach
    void setUp(TestInfo testInfo) {
        context = new Context("http://127.0.0.1:7345", Map.of(
                "test", Map.of("name", testInfo.getDisplayName(), "group", testInfo.getClass().getName()),
                "snapshot", true,
                "debug", true
        ));
        browser = context.createBrowserShim();
    }

    @AfterEach
    void tearDown() {
        if (browser != null) {
            try { browser.quit(); } catch (Exception ignored) {}
        }
        if (context != null) {
            try { context.destroy(); } catch (Exception ignored) {}
        }
    }

    static String playground() {
        return "https://playground.puth.dev/";
    }
}
