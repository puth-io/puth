---
title: Spring Boot integration
description: Run browser tests against your Spring Boot application with JUnit 5 and MockMvc.
---

# Spring Boot integration

::: warning Beta
The Spring Boot integration is tested in CI, but its API may still change.
:::

`PuthPortalExtension` is a JUnit 5 extension from the Java client. For every test it creates a Puth context, passes a `Browser` to the test method, and destroys the context afterwards. The browser's requests to your application go through [portal](./portal) to the test, which answers them with MockMvc, so the test needs no running server.

<div class="steps">

## Install the Java client

The Java client is not published to Maven Central yet. Install it into your local Maven repository from a checkout of the Puth repository:

```sh
cd workspaces/clients/java/client
mvn install -DskipTests
```

Then add it to your project's test dependencies:

```xml
<dependency>
    <groupId>io.puth.client</groupId>
    <artifactId>client</artifactId>
    <version>1.0-SNAPSHOT</version>
    <scope>test</scope>
</dependency>
```

## Start the server

Run a Puth server as described in [Getting started](./getting-started#start-the-server). The examples connect to `http://127.0.0.1:7345`.

## Register the extension

Register the extension on a `@SpringBootTest` with MockMvc. Configure portal for the URLs the browser visits: requests starting with `http://localhost` are answered by MockMvc, all others load normally.

```java
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
class HomePageTest {
    @Autowired
    MockMvc mockMvc;

    @RegisterExtension
    PuthPortalExtension puth = PuthPortalExtension.forMockMvc(
        () -> "http://127.0.0.1:7345",
        () -> Map.of(
            "snapshot", true,
            "supports", Map.of("portal", Map.of("urlPrefixes", List.of("http://localhost")))
        ),
        () -> mockMvc
    );

    @Test
    void shows_the_home_page(Browser browser) {
        browser.visit("http://localhost")
            .assertSee("Welcome");
    }
}
```

The second argument holds the [context options](/api/context). The extension adds the test's display name and class, so the GUI groups tests by class.

## Run your tests

```sh
mvn test
```

Open the Puth GUI to follow each test while it runs.

</div>

## Test parameters

Test methods can declare these parameters:

| Parameter | Value |
| --- | --- |
| `Browser browser` | A new Browser shim for the test's context. |
| `Context context` | The test's Puth context, for example to call `context.handoff(browser)`. |

When a test fails, the extension marks its context as failed before destroying it, so the GUI and its snapshot show the test as failed.

Failed Puth assertions throw JUnit's `AssertionFailedError`, so they count as test failures. JUnit does not count assertions, so the extension publishes the number of passed Puth assertions as the test's `puth.assertions` report entry, which IDEs and JUnit's reporting show. `context.getAssertionCount()` returns it in tests without the extension.

## Use a running server

`PuthPortalExtension.forRandomPort(puthUrl, options, baseUri)` sends portal requests over HTTP to a running application instead of MockMvc, for example one started with `@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)`. Use it when a test needs a real HTTP server rather than MockMvc's simulated requests.

## Example application

`workspaces/clients/java/workspaces/spring` in the Puth repository is a small Spring Boot application with portal tests for links, forms, query strings and script requests, each run with MockMvc and with a server on a random port. Use it as a starting point or to check your setup.
