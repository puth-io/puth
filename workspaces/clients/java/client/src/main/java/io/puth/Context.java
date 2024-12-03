package io.puth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.logging.Logger;

public class Context extends RemoteObject {
    private String baseUrl;
    private Map<String, Object> options;

    private HttpClient client;

    private boolean accumulateCalls = false;
    private List<Map<String, Object>> accumulatedCalls = new ArrayList<>();

    private boolean dev;
    private boolean debug;

    protected static final Logger logger = Logger.getLogger(Context.class.getName());
    protected static final ObjectMapper objectMapper = new ObjectMapper();

    public Context(String baseUrl, Map<String, Object> options) {
        super(null, null, null, null, null); // Initialize parent class with placeholders
        this.baseUrl = baseUrl;
        this.options = options;

        this.dev = (Boolean) options.getOrDefault("dev", false);
        this.debug = (Boolean) options.getOrDefault("debug", false);

        this.client = HttpClient.newBuilder().build();

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(baseUrl + "/context"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(options)))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> responseBody = objectMapper.readValue(response.body(), new TypeReference<>() {});

                this.id = (String) responseBody.get("id");
                this.type = (String) responseBody.get("type");
                this.represents = (String) responseBody.get("represents");

                this.parent = null; // Context is the root, no parent
                this.context = this;
            } else {
                throw new RuntimeException("Failed to create context, status code: " + response.statusCode() + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize Context: " + e.getMessage(), e);
        }
    }

    public boolean destroy(Map<String, Object> options) {
        try {
            // Merge options with serialized context
            Map<String, Object> requestBody = new HashMap<>(options);
            requestBody.putAll(serialize());

            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(baseUrl + "/context"))
                    .header("Content-Type", "application/json")
                    // Java's HttpClient doesn't support DELETE with body directly, use method() instead
                    .method("DELETE", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                log("destroyed");
                return true;
            } else if (response.statusCode() == 404) {
                return true; // Already destroyed or not found
            } else {
                throw new RuntimeException("Failed to destroy context, status code: " + response.statusCode());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to destroy context: " + e.getMessage(), e);
        }
    }

    public CdpBrowser createBrowser(Object... parameters) {
        return (CdpBrowser) this.callFunction("createBrowser", parameters);
    }

    public void startAccumulatingCalls() {
        this.accumulateCalls = true;
    }

    public void stopAccumulatingCalls() {
        this.accumulateCalls = false;
    }

    public boolean isAccumulateCalls() {
        return accumulateCalls;
    }

    public List<Map<String, Object>> getAccumulatedCalls() {
        return accumulatedCalls;
    }

    public boolean isDebug() {
        return debug;
    }

    @Override
    public void log(String message) {
        if (debug) {
            logger.info("[CTX " + (id != null ? id.substring(0, Math.min(4, id.length())) : "null") + "] " + message);
        }
    }

    @Override
    public HttpClient getClient() {
        return this.client;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}