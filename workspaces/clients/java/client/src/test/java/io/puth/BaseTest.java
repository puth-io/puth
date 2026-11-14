package io.puth;

import io.puth.client.Context;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.TestInfo;

import java.util.Map;

public class BaseTest {
    private static final String PUTH_INSTANCE_URL = System.getenv().getOrDefault("PUTH_INSTANCE_URL", "http://127.0.0.1:7345");
    private static final String PUTH_FIXTURE_URL = System.getenv().getOrDefault("PUTH_FIXTURE_URL", "http://127.0.0.1:8081");
    private static final String PUTH_FIXTURE_ALT_URL = System.getenv().getOrDefault("PUTH_FIXTURE_ALT_URL", "http://localhost:8082");

    Context context;
    Browser browser;

    @BeforeEach
    void setUp(TestInfo testInfo) {
        context = Context.create(PUTH_INSTANCE_URL, Map.of(
                "test", Map.of("name", testInfo.getDisplayName(), "group", testInfo.getClass().getName()),
                "snapshot", false,
                "debug", false
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

    static String instance() {
        return PUTH_INSTANCE_URL;
    }

    /** The primary fixture origin, which serves a small page titled "Puth fixture" for any path. */
    static String fixture() {
        return withTrailingSlash(PUTH_FIXTURE_URL);
    }

    /** The alternate fixture origin, titled "Puth fixture | Alternate origin". */
    static String alt() {
        return withTrailingSlash(PUTH_FIXTURE_ALT_URL);
    }

    private static String withTrailingSlash(String url) {
        return url.endsWith("/") ? url : url + "/";
    }
}
