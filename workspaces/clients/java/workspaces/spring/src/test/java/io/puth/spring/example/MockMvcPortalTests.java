package io.puth.spring.example;

import io.puth.client.junit.PuthPortalExtension;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MockMvcPortalTests extends PortalScenarios {
    @Autowired
    MockMvc mockMvc;

    @RegisterExtension
    PuthPortalExtension puth = PuthPortalExtension.forMockMvc(
            () -> PUTH_INSTANCE_URL,
            PortalScenarios::contextOptions,
            () -> mockMvc
    );
}
