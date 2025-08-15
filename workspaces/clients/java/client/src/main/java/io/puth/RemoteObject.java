package io.puth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

    public RemoteObject(String id, String type, String represents, RemoteObject parent, Context context) {
        this.id = id;
        this.type = type;
        this.represents = represents;
        this.parent = parent;
        this.context = context;
    }

    protected Object callFunction(String function, Object[] parameters) {
        try {
            List<Object> serializedParameters = new ArrayList<>();
            for (Object param : parameters) {
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

            if (context.isAccumulateCalls()) {
                context.getAccumulatedCalls().add(packet);
                return true;
//                return new DontProxy(); // You need to implement DontProxy or adjust the logic
            }

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
                throw new Exception("Error: " + body.get("message"));
            });
        } catch (Exception e) {
            throw new RuntimeException("Error in callFunction: " + e.getMessage(), e);
        }
    }

    public List<Object> sendAccumulatedCalls(String type) {
        try {
            if (context.isDebug()) {
                log("call multiple");
                log("with: " + objectMapper.writeValueAsString(context.getAccumulatedCalls()));
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("context", context.serialize());
            requestBody.put("calls", context.getAccumulatedCalls());

            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(new URI(context.getBaseUrl() + "/context/call/" + type))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = context.getClient().send(request, HttpResponse.BodyHandlers.ofString());

            if (context.isDebug()) {
                log("return: " + response.body());
            }

            List<Map<String, Object>> parts = objectMapper.readValue(response.body(), new TypeReference<>() {});
            List<Object> returnValues = new ArrayList<>();

            for (int i = 0; i < parts.size(); i++) {
                Map<String, Object> part = parts.get(i);
                Map<String, Object> call = context.getAccumulatedCalls().get(i);

                returnValues.add(parseGeneric(part, new Object[]{call.get("function"), call.get("parameters")}, (body, args) -> {
                    throw new Exception("Error: " + body.get("message"));
                }));
            }

            context.getAccumulatedCalls().clear();
            return returnValues;
        } catch (Exception e) {
            throw new RuntimeException("Error in sendAccumulatedCalls: " + e.getMessage(), e);
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

            HttpResponse<String> response = context.getClient().send(request, HttpResponse.BodyHandlers.ofString());

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

            if (context.isDebug()) {
                log("return: " + response.body());
            }

            // Check if binary response
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            if (contentType.contains("application/octet-stream")) {
                return response.body();
            }

            InputStream bodyStream = (InputStream) response.body();
            Map<String, Object> body = objectMapper.readValue(bodyStream, new TypeReference<>() {});

            if (body.isEmpty()) {
                return this;
            }

            return parseGeneric(body, arguments, onError);
        } catch (Exception e) {
            throw new RuntimeException("Error in handleResponse: " + e.getMessage(), e);
        }
    }

    protected Object parseGeneric(Map<String, Object> generic, Object[] arguments, ThrowingBiFunction<Map<String, Object>, Object[], Object> onError) throws Exception {
        String type = (String) generic.get("type");

        switch (type) {
            case "GenericValue":
            case "GenericValues":
                return generic.get("value");
            case "GenericObject":
                return resolveRemoteObject(generic);
            case "GenericObjects":
                List<Map<String, Object>> values = (List<Map<String, Object>>) generic.get("value");
                List<Object> objects = new ArrayList<>();
                for (Map<String, Object> item : values) {
                    objects.add(resolveRemoteObject(item));
                }
                return objects;
            case "GenericArray":
                List<Map<String, Object>> arrayValues = (List<Map<String, Object>>) generic.get("value");
                List<Object> arrayObjects = new ArrayList<>();
                for (Map<String, Object> item : arrayValues) {
                    arrayObjects.add(parseGeneric(item, arguments, onError));
                }
                return arrayObjects;
            case "GenericNull":
                return null;
            case "GenericSelf":
            case "GenericUndefined":
                return this;
            case "PuthAssertion":
                return generic;
            case "error":
                return onError.apply(generic, arguments);
            default:
                return this;
        }
    }

    /**
     * Resolves and creates the appropriate RemoteObject subclass based on the 'represents' value.
     *
     * @param generic The generic map containing object details.
     * @return An instance of a subclass of RemoteObject.
     */
    private RemoteObject resolveRemoteObject(Map<String, Object> generic) {
        String id = (String) generic.get("id");
        String type = (String) generic.get("type");
        String represents = (String) generic.get("represents");

        // Use reflection to instantiate the class based on the 'represents' string
        try {
            // Define the package where your binding classes are located
            String packageName = "io.puth";
            String className = packageName + "." + represents;
            log("Classpath " + className);

            // Load the class
            Class<?> clazz = Class.forName(className);

            // Ensure the class is a subclass of RemoteObject
            if (!RemoteObject.class.isAssignableFrom(clazz)) {
                throw new RuntimeException("Class " + className + " does not extend RemoteObject");
            }

            // Get the constructor that matches RemoteObject's constructor
            Constructor<?> constructor = clazz.getConstructor(String.class, String.class, String.class, RemoteObject.class, Context.class);

            // Instantiate the class
            RemoteObject obj = (RemoteObject) constructor.newInstance(id, type, represents, this, this.context);

            return obj;
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

    public Object getPropertyValue(String property) {
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
