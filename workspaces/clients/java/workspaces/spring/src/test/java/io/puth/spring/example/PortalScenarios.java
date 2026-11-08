package io.puth.spring.example;

import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

/**
 * Browser tests that reach the application only through portal. Subclasses
 * choose how portal requests are answered: MockMvc or a running server.
 */
abstract class PortalScenarios {
    static final String PUTH_INSTANCE_URL = System.getenv().getOrDefault("PUTH_INSTANCE_URL", "http://127.0.0.1:7345");

    // Requests to http://localhost go through portal; the browser never connects to it directly.
    static Map<String, Object> contextOptions() {
        return Map.of(
                "snapshot", true,
                "supports", Map.of("portal", Map.of("urlPrefixes", List.of("http://localhost")))
        );
    }

    @Test
    void shows_the_home_page(Browser browser) {
        browser.visit("http://localhost")
                .assertSee("Spring Boot Example Home");
    }

    @Test
    void follows_links(Browser browser) {
        browser.visit("http://localhost/pages")
                .clickLink("Contact form")
                .assertPathIs("/pages/form");
    }

    @Test
    void submits_a_form(Browser browser) {
        browser.visit("http://localhost/pages/form")
                .type("#name", "Ada <Lovelace>")
                .press("Send")
                .assertSee("Hello, Ada <Lovelace>");
    }

    @Test
    void keeps_the_query_string(Browser browser) {
        browser.visit("http://localhost/pages/search?q=browser+tests")
                .assertSee("Results for browser tests");
    }

    @Test
    void sends_json_bodies_from_scripts(Browser browser) {
        browser.visit("http://localhost/pages/script")
                .assertSee("Echo: {\"name\":\"Ada\"}");
    }
}
