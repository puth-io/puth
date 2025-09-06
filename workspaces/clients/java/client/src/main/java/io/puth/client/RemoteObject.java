package io.puth.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.lang.reflect.Array;
import java.lang.reflect.Constructor;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.rmi.Remote;
import java.util.*;
import java.util.logging.Logger;

public class RemoteObject {
    protected Context context;
    protected RemoteObject parent;

    protected String id;
    protected String type;
    protected String represents;

    protected static final ObjectMapper objectMapper = new ObjectMapper();
    protected static final Logger logger = Logger.getLogger(RemoteObject.class.getName());

    public interface PortalRequestHandler {
        /**
         * { "type":"PortalResponse", "status": 200, "headers": Map<String, String>, "body": String }
         */
        Map<String, Object> handlePortalRequest(Map<String, Object> request);
    }

    public RemoteObject(String id, String type, String represents, RemoteObject parent, Context context) {
        this.id = id;
        this.type = type;
        this.represents = represents;
        this.parent = parent;
        this.context = context;
    }

    protected Object callFunc(String function) {
        return this.callFunc(function, new Object[]{});
    }

    protected Object callFunc(String function, Object[] parameters) {
        try {
            List<Object> serializedParameters = new ArrayList<>();
            for (Object param : parameters) {
                if (param == null) continue;
                if (param instanceof RemoteObject) {
                    serializedParameters.add(((RemoteObject) param).serialize());
                } else {
                    serializedParameters.add(param);
                }
            }

            Map<String, Object> packet = new HashMap<>();
            packet.put("context", context.serialize());
            packet.put("type", this.type);
            packet.put("id", this.id);
            packet.put("function", function);
            packet.put("parameters", serializedParameters);

            if (context.isDebug()) {
                log("call: " + function);
                log("with: " + objectMapper.writeValueAsString(serializedParameters));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(context.getBaseUrl() + "/context/call"))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(packet)))
                    .build();

            HttpResponse<InputStream> response = context.getClient().send(request, HttpResponse.BodyHandlers.ofInputStream());

            return handleResponse(response, new Object[]{function, parameters}, (body, args) -> {
                throw new Exception("[Server] " + body.get("message"));
            });
        } catch (Exception e) {
            throw new RuntimeException("Error in callFunction: " + e.getMessage(), e);
        }
    }

    protected Object getProperty(String property) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("context", context.serialize());
            requestBody.put("type", this.type);
            requestBody.put("id", this.id);
            requestBody.put("property", property);

            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(context.getBaseUrl() + "/context/get"))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<InputStream> response = context.getClient().send(request, HttpResponse.BodyHandlers.ofInputStream());

            log("get: " + property);

            return handleResponse(response, new Object[]{property}, (body, args) -> {
                throw new Exception("Undefined property: '" + args[0] + "' (" + this.getClass().getSimpleName() + "::" + args[0] + ")");
            });
        } catch (Exception e) {
            throw new RuntimeException("Error in getProperty: " + e.getMessage(), e);
        }
    }

    protected Object handleResponse(HttpResponse<?> response, Object[] arguments, ThrowingBiFunction<Map<String, Object>, Object[], Object> onError) {
        try {
            if (response.statusCode() != 200) {
                throw new Exception("Server returned status code: " + response.statusCode());
            }

            // Check if binary response
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            if (contentType.contains("application/octet-stream")) {
                return response.body();
            }

            InputStream bodyStream = (InputStream) response.body();
            Map<String, Object> body = objectMapper.readValue(bodyStream, new TypeReference<>() {});

            if (context.isDebug()) {
                log("return: " + body);
            }
            if (body.isEmpty()) {
                return this;
            }

            return parseGeneric(body, arguments, onError);
        } catch (Exception e) {
            throw new RuntimeException("Error in handleResponse: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    protected Object parseGeneric(Map<String, Object> generic, Object[] arguments, ThrowingBiFunction<Map<String, Object>, Object[], Object> onError) throws Exception {
        Object typeObj = generic.get("type");
        if (typeObj == null) throw new RuntimeException("Server response: body.type not defined!");
        String type = String.valueOf(typeObj);

        // Handle meta.assertions (if provided) — no-op hook (kept for parity with PHP)
        Map<String, Object> meta = (Map<String, Object>) generic.get("meta");
        if (meta != null && meta.containsKey("assertions")) {
            // If your test framework supports counting assertions, hook it up here.
        }

        if ("ServerRequest".equals(type)) {
            return handlePortalRequestResponse(generic, arguments, onError);
        }

        if ("ExpectationFailed".equals(type)) {
            handleExpectationFailed(generic, arguments);
            return null; // never reached
        } else if ("error".equals(type)) {
            return onError.apply(generic, arguments);
        }

        switch (type) {
            case "GenericValue":
            case "GenericValues":
                return generic.get("value");
            case "GenericObject":
                return resolveRemoteObject(generic);
            case "GenericObjects": {
                List<Map<String, Object>> values = (List<Map<String, Object>>) generic.get("value");
                if (values.isEmpty()) {
                    return new RemoteObject[]{};
                }
                RemoteObject[] rtn = typedArray(resolveRemoteObject(values.get(0)).getClass(), values.size());
                for (int i = 0; i < values.size(); i++) {
                    rtn[i] = resolveRemoteObject(values.get(i));
                }

                return rtn;
            }
            case "GenericArray": {
                List<Map<String, Object>> values = (List<Map<String, Object>>) generic.get("value");
                Object[] rtn = new Object[values.size()];
                for (int i = 0; i < values.size(); i++) {
                    rtn[i] = parseGeneric(values.get(i), arguments, onError);
                }

                return rtn;
            }
            case "GenericNull":
                return null;
            case "GenericSelf":
            case "GenericUndefined":
            case "Dialog":
                return this;
            case "PuthAssertion":
                return generic;
            default:
                throw new RuntimeException("Unexpected generic type " + type);
        }
    }

    @SuppressWarnings("unchecked")
    public <T> T[] typedArray(Class<T> cls, int size) {
        return (T[]) Array.newInstance(cls, size);
    }

    /**
     * Throws an assertion-style exception if available (JUnit 5 or 4), otherwise a generic RuntimeException.
     */
    @SuppressWarnings("unchecked")
    private void handleExpectationFailed(Map<String, Object> generic, Object[] arguments) {
        String message = "Unknown error";
        try {
            Map<String, Object> value = (Map<String, Object>) generic.get("value");
            if (value != null && value.get("message") != null) {
                message = String.valueOf(value.get("message"));
            }
        } catch (Exception ignored) {
        }

        // Try JUnit
        if (isClassPresent("org.opentest4j.AssertionFailedError")) {
            try {
                Class<?> j5 = Class.forName("org.opentest4j.AssertionFailedError");
                throw (AssertionError) j5.getConstructor(String.class).newInstance(message);
            } catch (AssertionError assertionError) {
                throw assertionError;
            } catch (Exception ignored) {
            }
        }
        // Try TestNG
        if (isClassPresent("org.testng.Assert")) {
            throw new AssertionError("TestNG Assertion failed: " + message);
        }
        // Try AssertJ
        if (isClassPresent("org.assertj.core.api.Assertions")) {
            throw new AssertionError("AssertJ Assertion failed: " + message);
        }
        // Try Hamcrest
        if (isClassPresent("org.hamcrest.MatcherAssert")) {
            throw new AssertionError("Hamcrest Assertion failed: " + message);
        }
        // Fallback
        throw new AssertionError("Assertion failed: " + message);
    }

    private static boolean isClassPresent(String className) {
        try {
            Class.forName(className);
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private Object handlePortalRequestResponse(Map<String, Object> generic, Object[] arguments, ThrowingBiFunction<Map<String, Object>, Object[], Object> onError) throws Exception {
        log("server-request: handling");

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("type", "PortalResponse");

        try {
            // Extract incoming portal request
            Map<String, Object> value = (Map<String, Object>) generic.get("value");
            Map<String, Object> request = value != null ? (Map<String, Object>) value.get("request") : null;

            PortalRequestHandler handler = null;
            // If Context provides a handler, use it
            try {
                handler = context.getPortalRequestHandler();
            } catch (Throwable ignored) {
                throw new RuntimeException("Portal requests not supported.");
            }
            if (handler == null) {
                throw new RuntimeException("Portal requests not supported.");
            }

            if (request != null) {
                responseMap = handler.handlePortalRequest(request);
                if (responseMap == null) responseMap = new HashMap<>();
            }

            // Always include psuri from request for routing
            if (request != null && request.get("psuri") != null) {
                responseMap.put("psuri", request.get("psuri"));
            }

            if (context.isDebug()) {
                Map<String, Object> debug = new HashMap<>();
                debug.put("status", responseMap.get("status"));
                debug.put("headers", responseMap.get("headers"));
                Object body = responseMap.get("body");
                String bodyPreview = body == null ? null : String.valueOf(body);
                if (bodyPreview != null && bodyPreview.length() > 500) bodyPreview = bodyPreview.substring(0, 500);
                debug.put("body", bodyPreview);
                log("server-request: response: " + debug);
            }

            // Send response back to server
            Map<String, Object> payload = new HashMap<>();
            payload.put("context", context.serialize());
            payload.put("response", responseMap);

            HttpRequest portalReq = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(context.getBaseUrl() + "/portal/response"))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<InputStream> portalRes = context.getClient().send(portalReq, HttpResponse.BodyHandlers.ofInputStream());

            return handleResponse(portalRes, arguments, onError);
        } catch (Throwable t) {
            // Surface any error via onError path
            Map<String, Object> err = new HashMap<>();
            err.put("type", "error");
            err.put("message", t.getMessage());
            return onError.apply(err, arguments);
        }
    }

    /**
     * Resolves and creates the appropriate RemoteObject subclass based on the 'represents' value.
     */
    private RemoteObject resolveRemoteObject(Map<String, Object> generic) {
        String id = String.valueOf(generic.get("id"));
        String type = String.valueOf(generic.get("type"));
        String represents = String.valueOf(generic.get("represents"));

        try {
            String packageName = "io.puth.client.remote";
            String className = packageName + "." + represents;
            log("Classpath " + className);

            Class<?> clazz = Class.forName(className);
            if (!RemoteObject.class.isAssignableFrom(clazz)) {
                throw new RuntimeException("Class " + className + " does not extend RemoteObject");
            }

            Constructor<?> constructor = clazz.getConstructor(String.class, String.class, String.class, RemoteObject.class, Context.class);
            return (RemoteObject) constructor.newInstance(id, type, represents, this, this.context);
        } catch (ClassNotFoundException e) {
            logger.warning("Class not found for represents: " + represents + ". Falling back to RemoteObject.");
            return new RemoteObject(id, type, represents, this, context);
        } catch (NoSuchMethodException e) {
            logger.warning("No suitable constructor found for class: " + represents + ". Falling back to RemoteObject.");
            return new RemoteObject(id, type, represents, this, context);
        } catch (Exception e) {
            logger.warning("Error instantiating class for represents: " + represents + ". Falling back to RemoteObject. Error: " + e.getMessage());
            return new RemoteObject(id, type, represents, this, context);
        }
    }

    public Object getPropertyValue(String property) throws Throwable {
        return getProperty(property);
    }

    protected void log(String message) {
        if (context.isDebug()) {
            logger.info("[GEN " + getRepresents() + "] " + message);
        }
    }

    // Getters for id, type, represents, and client
    public String getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getRepresents() {
        return represents;
    }

    public HttpClient getClient() {
        return parent != null ? parent.getClient() : context.getClient();
    }

    public String getBaseUrl() {
        return context.getBaseUrl();
    }

    public Map<String, Object> serialize() {
        Map<String, Object> data = new HashMap<>();
        data.put("id", getId());
        data.put("type", getType());
        data.put("represents", getRepresents());
        return data;
    }

    @Override
    public String toString() {
        return "RemoteObject(" + getRepresents() + ", " + getId() + ")";
    }
}
