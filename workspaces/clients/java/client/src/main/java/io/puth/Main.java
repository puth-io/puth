package io.puth;

import java.util.ArrayList;
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

        CdpBrowser browser = context.createBrowser();
        ArrayList<RemoteObject> pages = (ArrayList<RemoteObject>) browser.callFunction("pages", new Object[]{});
        RemoteObject page = pages.getFirst();

        page.callFunction("visit", new Object[]{"https://puth.io"});

        System.out.println(page.callFunction("url", new Object[]{}));
    }
}
