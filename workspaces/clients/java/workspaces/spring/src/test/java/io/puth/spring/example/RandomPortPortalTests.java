package io.puth.spring.example;

import io.puth.client.junit.PuthPortalExtension;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RandomPortPortalTests extends PortalScenarios {
    @LocalServerPort
    int port;

    @RegisterExtension
    PuthPortalExtension puth = PuthPortalExtension.forRandomPort(
            () -> PUTH_INSTANCE_URL,
            PortalScenarios::contextOptions,
            () -> URI.create("http://localhost:" + port)
    );
}
