package io.puth.spring.example.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.web.util.HtmlUtils.htmlEscape;

// Small pages for the portal tests: links, forms, query strings and script requests.
@RestController
public class PagesController {
    @GetMapping(value = "/pages", produces = MediaType.TEXT_HTML_VALUE)
    public String index() {
        return page("Pages", """
                <h1>Pages</h1>
                <a href="/pages/form">Contact form</a>
                <a href="/pages/search?q=browser+tests">Search</a>
                """);
    }

    @GetMapping(value = "/pages/form", produces = MediaType.TEXT_HTML_VALUE)
    public String form() {
        return page("Contact", """
                <form method="post" action="/pages/form">
                    <label for="name">Name</label>
                    <input id="name" name="name">
                    <button type="submit">Send</button>
                </form>
                """);
    }

    @PostMapping(value = "/pages/form", produces = MediaType.TEXT_HTML_VALUE)
    public String submit(@RequestParam("name") String name) {
        return page("Sent", "<p id=\"greeting\">Hello, " + htmlEscape(name) + "</p>");
    }

    @GetMapping(value = "/pages/search", produces = MediaType.TEXT_HTML_VALUE)
    public String search(@RequestParam("q") String query) {
        return page("Search", "<p>Results for " + htmlEscape(query) + "</p>");
    }

    @GetMapping(value = "/pages/script", produces = MediaType.TEXT_HTML_VALUE)
    public String script() {
        return page("Script", """
                <output id="echo"></output>
                <script>
                    fetch('/api/echo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'Ada' }),
                    }).then(response => response.text()).then(text => {
                        document.getElementById('echo').textContent = 'Echo: ' + text;
                    });
                </script>
                """);
    }

    @PostMapping(value = "/api/echo", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    public String echo(@RequestBody String body) {
        return body;
    }

    private static String page(String title, String body) {
        return "<!doctype html><html><head><title>" + title + "</title></head><body>" + body + "</body></html>";
    }
}
