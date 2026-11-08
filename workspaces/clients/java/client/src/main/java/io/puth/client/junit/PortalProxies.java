package io.puth.client.junit;

import io.puth.client.RemoteObject;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;

final class PortalProxies {
    private PortalProxies() {
    }

    static RemoteObject.PortalRequestHandler httpClientProxy(Supplier<URI> baseUriSupplier) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        return request -> {
            try {
                String method = String.valueOf(request.getOrDefault("method", "GET"));
                String path = requestPath(request);
                byte[] body = requestBody(request);
                @SuppressWarnings("unchecked") Map<String, List<String>> headers = coerceHeaders(request.get("headers"));

                URI base = baseUriSupplier.get();
                String url = base.toString().replaceAll("/$", "") + path;

                HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(30))
                        .method(method.toUpperCase(Locale.ROOT),
                                body.length == 0
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofByteArray(body));

                headers.forEach((k, vs) -> {
                    if (k == null) return;
                    String key = k.trim();
                    if (key.equalsIgnoreCase("host") || key.equalsIgnoreCase("content-length")) return;
                    for (String v : vs) if (v != null) rb.header(key, v);
                });

                HttpResponse<byte[]> res = http.send(rb.build(), HttpResponse.BodyHandlers.ofByteArray());

                Map<String, Object> portalResponse = new LinkedHashMap<>();
                portalResponse.put("type", "PortalResponse");
                portalResponse.put("status", res.statusCode());
                portalResponse.put("headers", res.headers().map());
                portalResponse.put("body", Base64.getEncoder().encodeToString(res.body()));

                Object psuri = request.get("psuri");
                if (psuri != null) portalResponse.put("psuri", psuri);
                return portalResponse;
            } catch (Exception e) {
                return portalFailure(e);
            }
        };
    }

    static RemoteObject.PortalRequestHandler mockMvcProxy(Supplier<MockMvc> mockMvcSupplier) {
        return request -> {
            try {
                MockMvc mockMvc = Objects.requireNonNull(mockMvcSupplier.get(), "mockMvcSupplier returned null");
                String method = String.valueOf(request.getOrDefault("method", "GET"));
                String path = requestPath(request);
                byte[] body = requestBody(request);
                @SuppressWarnings("unchecked") Map<String, List<String>> headers = coerceHeaders(request.get("headers"));

                // A URI, not a URI template: query strings and braces in paths are passed as they are.
                MockHttpServletRequestBuilder rb = MockMvcRequestBuilders.request(HttpMethod.valueOf(method.toUpperCase(Locale.ROOT)), URI.create(path));
                headers.forEach((k, vs) -> {
                    if (k == null) return;
                    String key = k.trim();
                    if (key.equalsIgnoreCase("content-length")) return;
                    for (String v : vs) if (v != null) rb.header(key, v);
                });
                if (body.length > 0) rb.content(body);

                MockHttpServletResponse res = mockMvc.perform(rb).andReturn().getResponse();

                Map<String, Object> portalResponse = new LinkedHashMap<>();
                portalResponse.put("type", "PortalResponse");
                portalResponse.put("status", res.getStatus());

                Map<String, List<String>> respHeaders = new LinkedHashMap<>();
                for (String name : res.getHeaderNames()) {
                    respHeaders.put(name, new ArrayList<>(res.getHeaders(name)));
                }
                portalResponse.put("headers", respHeaders);
                portalResponse.put("body", Base64.getEncoder().encodeToString(res.getContentAsByteArray()));

                Object psuri = request.get("psuri");
                if (psuri != null) portalResponse.put("psuri", psuri);
                return portalResponse;
            } catch (Exception e) {
                return portalFailure(e);
            }
        };
    }

    // The path relative to the portal prefix, including the query. The prefix itself arrives as "".
    static String requestPath(Map<String, Object> request) {
        Object raw = request.get("path");
        String path = raw == null ? "" : String.valueOf(raw);
        return path.startsWith("/") ? path : "/" + path;
    }

    // Puth sends the request body base64 encoded in "data".
    static byte[] requestBody(Map<String, Object> request) {
        Object data = request.get("data");
        if (data == null || String.valueOf(data).isEmpty()) return new byte[0];
        return Base64.getDecoder().decode(String.valueOf(data));
    }

    // No HTTP response exists here, so this must not look like a server's own 5xx response.
    static Map<String, Object> portalFailure(Exception e) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("reason", portalFailureReason(e));
        error.put("message", String.valueOf(e.getMessage()));

        Map<String, Object> portalResponse = new LinkedHashMap<>();
        portalResponse.put("type", "PortalResponse");
        portalResponse.put("error", error);
        return portalResponse;
    }

    private static String portalFailureReason(Exception e) {
        if (e instanceof java.net.http.HttpTimeoutException) return "TimedOut";
        if (e instanceof java.net.ConnectException) return "ConnectionRefused";
        if (e instanceof java.net.UnknownHostException) return "NameNotResolved";
        return "Failed";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, List<String>> coerceHeaders(Object raw) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        if (raw instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> e : map.entrySet()) {
                String key = e.getKey() == null ? null : String.valueOf(e.getKey());
                Object v = e.getValue();
                if (v == null) continue;
                if (v instanceof List<?> list) {
                    List<String> vs = new ArrayList<>();
                    for (Object o : list) vs.add(String.valueOf(o));
                    out.put(key, vs);
                } else if (v instanceof String s) {
                    out.put(key, List.of(s));
                } else {
                    out.put(key, List.of(String.valueOf(v)));
                }
            }
        }
        return out;
    }

    private static boolean isTextual(String ct) {
        if (ct == null) return false;
        String s = ct.toLowerCase(Locale.ROOT);
        return s.startsWith("text/") || s.contains("json") || s.contains("xml") || s.contains("html") || s.contains("javascript") || s.contains("svg");
    }
}