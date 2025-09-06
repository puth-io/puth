package io.puth.client;

import io.puth.client.remote.Browser;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Context context = new Context("http://127.0.0.1:7345", Map.of(
                "test", Map.of(
                        "name", "Example Test"
                ),
                "snapshot", true,
                "debug", true
        ));

        Browser browser = context.createBrowserShim();

        browser.visit("https://puth.io")
                .assertSee("Puth's playground")
                .assertVisible("#querying-get");

        System.out.println(browser.bounds());
        System.out.println(browser.url());
    }
}
