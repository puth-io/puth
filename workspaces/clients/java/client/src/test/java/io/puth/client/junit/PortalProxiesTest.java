package io.puth.client.junit;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class PortalProxiesTest {
    @Test
    @SuppressWarnings("unchecked")
    void reports_an_unreachable_upstream_as_a_network_failure() throws Exception {
        var proxy = PortalProxies.httpClientProxy(() -> URI.create("http://127.0.0.1:1"));

        Map<String, Object> response = proxy.handlePortalRequest(Map.of("method", "GET", "path", "/"));

        assertFalse(response.containsKey("status"));
        assertEquals("ConnectionRefused", ((Map<String, Object>) response.get("error")).get("reason"));
    }

    @Test
    void returns_a_response_the_caller_can_address() throws Exception {
        var proxy = PortalProxies.httpClientProxy(() -> URI.create("http://127.0.0.1:1"));

        Map<String, Object> response = proxy.handlePortalRequest(Map.of("method", "GET", "path", "/"));
        response.put("psuri", "1");

        assertEquals("1", response.get("psuri"));
    }
}
