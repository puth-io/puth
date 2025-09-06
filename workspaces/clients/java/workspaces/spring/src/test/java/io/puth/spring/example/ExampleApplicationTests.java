package io.puth.spring.example;

import io.puth.client.junit.PuthPortalExtension;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

@SpringBootTest
@AutoConfigureMockMvc
class ExampleApplicationTests {
    @Autowired
    MockMvc mockMvc;

    @RegisterExtension
    PuthPortalExtension puth = PuthPortalExtension.forMockMvc(
            () -> "http://127.0.0.1:7345",
            () -> Map.of(
                    "test", Map.of("name", "BrowserMockMvcTest", "group", this.getClass().getName()),
                    "snapshot", true,
                    "debug", true,
                    "supports", Map.of("portal", Map.of("urlPrefixes", List.of("http://localhost")))
            ),
            () -> mockMvc
    );

    @Test
    void portal_test(Browser browser) {
        browser
                .visit("http://localhost")
                .assertSee("Spring Boot Example Home");
    }
}
