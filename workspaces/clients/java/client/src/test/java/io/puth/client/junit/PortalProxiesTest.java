package io.puth.client.junit;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
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

    @Test
    void forwards_the_request_body_and_query_to_a_running_server() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/echo", exchange -> {
            byte[] body = exchange.getRequestBody().readAllBytes();
            String reply = exchange.getRequestURI().getQuery() + " " + new String(body, StandardCharsets.UTF_8);
            byte[] bytes = reply.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        try {
            var proxy = PortalProxies.httpClientProxy(() -> URI.create("http://127.0.0.1:" + server.getAddress().getPort()));

            Map<String, Object> response = proxy.handlePortalRequest(post("/echo?x=1", "name=Ada&role=tester"));

            assertEquals(200, response.get("status"), String.valueOf(response.get("error")));
            assertEquals("x=1 name=Ada&role=tester", body(response));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void forwards_the_request_body_and_query_to_mock_mvc() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new EchoController()).build();
        var proxy = PortalProxies.mockMvcProxy(() -> mockMvc);

        Map<String, Object> response = proxy.handlePortalRequest(post("/echo?x=1", "hello"));

        assertEquals(200, response.get("status"), String.valueOf(response.get("error")));
        assertEquals("1 hello", body(response));
    }

    @Test
    void decodes_query_parameters_like_a_servlet_container() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new EchoController()).build();
        var proxy = PortalProxies.mockMvcProxy(() -> mockMvc);

        Map<String, Object> response = proxy.handlePortalRequest(Map.of("method", "GET", "path", "/search?q=browser+tests&tag=a%26b"));

        assertEquals(200, response.get("status"), String.valueOf(response.get("error")));
        assertEquals("browser tests a&b", body(response));
    }

    @Test
    void serves_the_portal_prefix_itself_as_the_root_path() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new EchoController()).build();
        var proxy = PortalProxies.mockMvcProxy(() -> mockMvc);

        Map<String, Object> response = proxy.handlePortalRequest(Map.of("method", "GET", "path", "", "data", ""));

        assertEquals(200, response.get("status"), String.valueOf(response.get("error")));
        assertEquals("home", body(response));
    }

    @Test
    void groups_tests_by_their_class() {
        assertEquals(
                Map.of("name", "shows the home page", "group", PortalProxiesTest.class.getName()),
                PuthPortalExtension.testInfo("shows the home page", PortalProxiesTest.class));
    }

    private static Map<String, Object> post(String path, String body) {
        return Map.of(
                "method", "POST",
                "path", path,
                "headers", Map.of("Content-Type", List.of("text/plain")),
                "data", Base64.getEncoder().encodeToString(body.getBytes(StandardCharsets.UTF_8)));
    }

    private static String body(Map<String, Object> response) {
        return new String(Base64.getDecoder().decode((String) response.get("body")), StandardCharsets.UTF_8);
    }

    @RestController
    static class EchoController {
        @GetMapping("/")
        String home() {
            return "home";
        }

        @GetMapping("/search")
        String search(@RequestParam("q") String query, @RequestParam("tag") String tag) {
            return query + " " + tag;
        }

        @PostMapping("/echo")
        String echo(@RequestParam("x") String x, @RequestBody String body) {
            return x + " " + body;
        }
    }
}
