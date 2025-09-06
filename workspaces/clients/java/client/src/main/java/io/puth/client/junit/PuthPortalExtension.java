package io.puth.client.junit;

import io.puth.client.remote.Browser;
import io.puth.client.Context;
import io.puth.client.RemoteObject;
import org.junit.jupiter.api.extension.*;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

public class PuthPortalExtension implements BeforeEachCallback, AfterEachCallback, ParameterResolver {
    private static final ExtensionContext.Namespace NS = ExtensionContext.Namespace.create(PuthPortalExtension.class);

    private final Supplier<String> puthBaseUrl;
    private final Supplier<Map<String, Object>> contextOptions;

    private final Supplier<RemoteObject.PortalRequestHandler> handlerSupplier;

    private PuthPortalExtension(Supplier<String> puthBaseUrl,
                                Supplier<Map<String, Object>> contextOptions,
                                Supplier<RemoteObject.PortalRequestHandler> handlerSupplier) {
        this.puthBaseUrl = Objects.requireNonNull(puthBaseUrl);
        this.contextOptions = Objects.requireNonNull(contextOptions);
        this.handlerSupplier = Objects.requireNonNull(handlerSupplier);
    }

    // Factory: RANDOM_PORT with base URI supplier
    public static PuthPortalExtension forRandomPort(Supplier<String> puthBaseUrl,
                                                    Supplier<Map<String, Object>> options,
                                                    Supplier<URI> springBaseUri) {
        return new PuthPortalExtension(puthBaseUrl, options,
                () -> PortalProxies.httpClientProxy(() -> springBaseUri.get()));
    }

    // Factory: MockMvc supplier
    public static PuthPortalExtension forMockMvc(Supplier<String> puthBaseUrl,
                                                 Supplier<Map<String, Object>> options,
                                                 Supplier<MockMvc> mockMvcSupplier) {
        return new PuthPortalExtension(puthBaseUrl, options,
                () -> PortalProxies.mockMvcProxy(mockMvcSupplier));
    }

    @Override
    public void beforeEach(ExtensionContext ctx) {
        var options = new HashMap<>(contextOptions.get());
        options.put("test", Map.of("name", ctx.getDisplayName(), "group", ctx.getClass().getName()));

        Context context = new Context(puthBaseUrl.get(), options);
        context.setPortalRequestHandler(handlerSupplier.get());
        ctx.getStore(NS).put("context", context);
    }

    @Override
    public void afterEach(ExtensionContext ctx) {
        Context context = getContext(ctx);
        if (ctx.getExecutionException().isPresent()) {
            context.testFailed();
        }
        context.destroy(Map.of("context", Map.of()));

        ctx.getStore(NS).remove("context");
    }

    private static Context getContext(ExtensionContext ctx) {
        return ctx.getStore(NS).get("context", Context.class);
    }

    @Override
    public boolean supportsParameter(ParameterContext pc, ExtensionContext ec) throws ParameterResolutionException {
        Class<?> type = pc.getParameter().getType();
        return type == Context.class || type == Browser.class;
    }

    @Override
    public Object resolveParameter(ParameterContext pc, ExtensionContext ec) throws ParameterResolutionException {
        Class<?> type = pc.getParameter().getType();
        Context c = getContext(ec);
        if (type == Context.class) return c;
        if (type == Browser.class) return c.createBrowserShim();
        throw new ParameterResolutionException("Unsupported parameter type: " + type);
    }
}